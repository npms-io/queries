'use strict';

const pTry = require('p-try');
const pick = require('lodash/pick');
const parseQuery = require('./util/parseSearchQuery');
const toEsClient = require('./util/toEsClient');

function buildMatchQueries(params) {
    if (!params.text) {
        return [];
    }

    return [
        // Standard match using cross_fields
        {
            multi_match: {
                query: params.text,
                operator: 'and',
                fields: [
                    'package.name.standard^4',
                    'package.description.standard',
                    'package.keywords.standard^2',
                ],
                type: 'cross_fields',
                boost: 6,
                tie_breaker: 0.5,
            },
        },

        // Partial match using edge-ngram
        {
            multi_match: {
                query: params.text,
                operator: 'and',
                fields: [
                    'package.name.edge_ngram^4',
                    'package.description.edge_ngram',
                    'package.keywords.edge_ngram^2',
                ],
                type: 'phrase',
                slop: 3,
                boost: 3,
                tie_breaker: 0.5,
            },
        },

        // Normal term match with an english stemmer
        {
            multi_match: {
                query: params.text,
                operator: 'and',
                fields: [
                    'package.name.english_docs^4',
                    'package.description.english_docs',
                    'package.keywords.english_docs^2',
                ],
                type: 'cross_fields',
                boost: 3,
                tie_breaker: 0.5,
            },
        },

        // Normal term match with a more aggressive english stemmer (not so important)
        {
            multi_match: {
                query: params.text,
                operator: 'and',
                fields: [
                    'package.name.english_aggressive_docs^4',
                    'package.description.english_aggressive_docs',
                    'package.keywords.english_aggressive_docs^2',
                ],
                type: 'cross_fields',
                tie_breaker: 0.5,
            },
        },
    ];
}

function buildFilterQuery(params) {
    const filters = {
        must: [],
        mustNot: [],
    };

    if (params.author) {
        filters.must.push({
            bool: {
                should: [
                    { term: { 'package.author.name': params.author } },
                    { term: { 'package.author.username': params.author } },
                    { term: { 'package.author.email': params.author } },
                ],
            },
        });
    }

    if (params.maintainer) {
        filters.must.push({
            bool: {
                should: [
                    { term: { 'package.maintainers.username': params.maintainer } },
                    { term: { 'package.maintainers.email': params.maintainer } },
                ],
            },
        });
    }

    if (params.scope) {
        filters.must.push({
            term: { 'package.scope': params.scope },
        });
    }

    if (params.keywords.include.length) {
        filters.must.push({
            terms: { 'package.keywords.raw': params.keywords.include },  // Operator is OR
        });
    }
    if (params.keywords.exclude.length) {
        filters.mustNot.push({
            terms: { 'package.keywords.raw': params.keywords.exclude },
        });
    }
    if (params.is.length) {
        filters.must.push({
            bool: {
                must: params.is.map((is) => ({
                    exists: { field: `flags.${is}` },
                })),
            },
        });
    }

    if (params.not.length) {
        filters.mustNot.push({
            bool: {
                must: params.not.map((not) => ({
                    exists: { field: `flags.${not}` },
                })),
            },
        });
    }

    return filters;
}

function buildScriptScore(params) {
    let source = '(doc["score.detail.popularity"].value * params.popularityWeight + ' +
        'doc["score.detail.quality"].value * params.qualityWeight + ' +
        'doc["score.detail.maintenance"].value * params.maintenanceWeight)';

    source = params.boostExact ?
            `doc["package.name.raw"].value.equals(params.text) ? 100000 + ${source} : _score * Math.pow(${source}, params.scoreEffect)` :
            `_score * Math.pow(${source}, params.scoreEffect)`;

    return {
        script: {
            source,
            params: {
                text: params.text || '',
                scoreEffect: params.scoreEffect,
                qualityWeight: params.qualityWeight,
                popularityWeight: params.popularityWeight,
                maintenanceWeight: params.maintenanceWeight,
            },
        },
    };
}

// ------------------------------------------------------------

function search(q, esClient, options) {
    esClient = toEsClient(esClient);
    options = Object.assign({ from: 0, size: 25, throwOnInvalid: false }, options);

    return pTry(() => parseQuery(q, options))
    .then((params) => {
        if (!params) {
            return { total: 0, results: [] };
        }

        const matchQueries = buildMatchQueries(params);
        const filterQuery = buildFilterQuery(params);
        const scriptScore = buildScriptScore(params);

        // Need to use Promise.resolve because Elasticsearch does not use native Promise
        /* eslint camelcase: 0 */
        return Promise.resolve(esClient.search({
            index: 'npms-current',
            type: 'score',
            body: {
                size: options.size,
                from: options.from,
                query: {
                    function_score: {
                        boost_mode: 'replace',
                        query: {
                            bool: {
                                must: filterQuery.must,
                                must_not: filterQuery.mustNot,
                                should: matchQueries,
                                minimum_should_match: matchQueries.length ? 1 : 0,
                            },
                        },
                        script_score: scriptScore,
                    },
                },
            },
        }))
        .then((res) => ({
            total: res.hits.total,
            results: res.hits.hits.map((hit) => {
                // We can't use _fields in the query because the JSON properties order get messed up,
                // see https://github.com/elastic/elasticsearch/issues/17639
                // So we filter the source fields manually with pick().. this is not ideal since there's payload
                // navigating through the network that we do not use, but it's definitively better than having order messed up
                const result = pick(hit._source, 'package', 'flags', 'score');

                result.searchScore = hit._score;

                return result;
            }),
        }));
    });
}

module.exports = search;

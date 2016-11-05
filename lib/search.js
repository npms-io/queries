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
            or: [
                { term: { 'package.author.name': params.author } },
                { term: { 'package.author.username': params.author } },
                { term: { 'package.author.email': params.author } },
            ],
        });
    }

    if (params.maintainer) {
        filters.must.push({
            or: [
                { term: { 'package.maintainers.username': params.maintainer } },
                { term: { 'package.maintainers.email': params.maintainer } },
            ],
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
            and: params.is.map((is) => ({
                exists: { field: `flags.${is}` },
            })),
        });
    }

    if (params.not.length) {
        filters.mustNot.push({
            or: params.not.map((not) => ({
                exists: { field: `flags.${not}` },
            })),
        });
    }

    return filters;
}

function buildScriptScore(params) {
    let script = '(doc["score.detail.popularity"].value * popularityWeight + ' +
        'doc["score.detail.quality"].value * qualityWeight + ' +
        'doc["score.detail.maintenance"].value * maintenanceWeight)';

    if (params.boostExact) {
        script = `doc["package.name.raw"].value.equals(text) ? 100000 + ${script} : _score * pow(${script}, scoreEffect)`;
    }

    return {
        lang: 'groovy',
        script,
        params: {
            text: params.text || '',
            scoreEffect: params.scoreEffect,
            qualityWeight: params.qualityWeight,
            popularityWeight: params.popularityWeight,
            maintenanceWeight: params.maintenanceWeight,
        },
    };
}

// ------------------------------------------------------------

function search(q, esClient, options) {
    esClient = toEsClient(esClient);
    options = Object.assign({ from: 0, size: 25, throwOnInvalid: false }, options);

    return pTry(() => parseQuery(q, options))
    .then((params) => {
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
                                minimum_should_match: 1,
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

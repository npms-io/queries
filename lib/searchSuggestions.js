'use strict';

const pick = require('lodash/pick');
const parseQuery = require('./util/parseSearchQuery');
const toEsClient = require('./util/toEsClient');

function searchSuggestions(q, esClient, options) {
    esClient = toEsClient(esClient);
    options = Object.assign({ size: 25 }, options);

    const text = parseQuery.discardQualifiers(q);

    // Need to use Promise.resolve because Elasticsearch does not use native Promise
    return Promise.resolve(esClient.search({
        /* eslint camelcase: 0 */
        index: 'npms-current',
        type: 'score',
        body: {
            size: options.size,
            highlight: {
                fields: {
                    'package.name.autocomplete_highlight': { type: 'postings' },
                },
            },
            query: {
                function_score: {
                    boost_mode: 'replace',
                    query: {
                        bool: {
                            // Match against the autocomplete field
                            must: [
                                {
                                    match_phrase: {
                                        'package.name.autocomplete': {
                                            query: text,
                                            slop: 3,
                                        },
                                    },
                                },
                            ],
                            should: [
                                // Exact prefix queries get the higher boost
                                {
                                    match: {
                                        'package.name.autocomplete_keyword': {
                                            query: text,
                                            boost: 4,
                                        },
                                    },
                                },
                                // Proximity exact match get medium boost
                                // e.g.: searching for "react form" should give higher score to "react-form-fields" than "react-formal"
                                {
                                    match_phrase: {
                                        'package.name': {
                                            query: text,
                                            slop: 0,
                                            boost: 2,
                                        },
                                    },
                                },
                                // This is just here for the highlighting
                                {
                                    match_phrase: {
                                        'package.name.autocomplete_highlight': {
                                            query: text,
                                            slop: 50,  // This needs to be high because each expansion is a word
                                        },
                                    },
                                },
                            ],
                        },
                    },
                    script_score: {
                        lang: 'groovy',
                        script: 'doc["package.name.raw"].value.equals(text) ? 100000 + _score : _score',
                        params: { text },
                    },
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
            const result = pick(hit._source, ['package', 'flags', 'score']);

            result.searchScore = hit._score;
            result.highlight = hit.highlight && hit.highlight['package.name.autocomplete_highlight'][0];

            return result;
        }),
    }));
}

module.exports = searchSuggestions;

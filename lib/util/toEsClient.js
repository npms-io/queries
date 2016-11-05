'use strict';

const elasticsearch = require('elasticsearch');

function toEsClient(esClient) {
    return esClient && typeof esClient.search === 'function' ?
        esClient :
        new elasticsearch.Client(esClient);
}

module.exports = toEsClient;

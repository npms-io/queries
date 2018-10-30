'use strict';

const expect = require('chai').expect;
const elasticsearch = require('elasticsearch');
const nockBack = require('nock').back;
const queries = require('../../');

const localEsClient = new elasticsearch.Client({ host: '127.0.0.1:9200', log: null, apiVersion: '6.3' });

describe('search.suggestions()', () => {
    it('should return the desired results', () => {
        let nockDone;

        nockBack('search-suggestions-sass.json', (_nockDone) => { nockDone = _nockDone; });

        return queries.search.suggestions('sass', localEsClient)
        .then((suggestions) => {
            expect(suggestions).to.have.length(25);
            expect(suggestions[0]).to.contain.all.keys('package', 'score', 'searchScore', 'highlight');
            expect(suggestions[0].package.name).to.equal('sass');
            nockDone();
        });
    });

    it('should ignore qualifiers', () => {
        let nockDone;

        nockBack('search-suggestions-sass.json', (_nockDone) => { nockDone = _nockDone; });

        return queries.search.suggestions('author:satazor sass', localEsClient)
        .then((suggestions) => {
            expect(suggestions).to.have.length(25);
            expect(suggestions[0]).to.contain.all.keys('package', 'score', 'searchScore', 'highlight');
            expect(suggestions[0].package.name).to.equal('sass');
            nockDone();
        });
    });

    it('should ignore qualifiers (empty text)', () => {
        let nockDone;

        nockBack('search-suggestions-sass.json', (_nockDone) => { nockDone = _nockDone; });

        return queries.search.suggestions('author:satazor', localEsClient)
        .then((suggestions) => {
            expect(suggestions).to.eql([]);
            nockDone();
        });
    });

    it('should accept a elasticsearch config as the second argument', () => {
        let nockDone;

        nockBack('search-suggestions-sass.json', (_nockDone) => { nockDone = _nockDone; });

        return queries.search.suggestions('sass', { host: '127.0.0.1:9200', log: null, apiVersion: '2.4' })
        .then((suggestions) => {
            expect(suggestions).to.have.length(25);
            nockDone();
        });
    });
});

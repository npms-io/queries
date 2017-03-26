'use strict';

const expect = require('chai').expect;
const parseSearchQuery = require('../../../lib/util/parseSearchQuery');

describe('util/parseSearchQuery()', () => {
    it('should parse q into params', () => {
        let params;

        // Test simple text
        params = parseSearchQuery('foo');
        expect(params).to.eql({
            text: 'foo',
            author: null,
            maintainer: null,
            scope: null,
            keywords: { include: [], exclude: [] },
            not: [],
            is: [],
            boostExact: true,
            scoreEffect: 15.3,
            qualityWeight: 0.26027397260273977,
            popularityWeight: 0.452054794520548,
            maintenanceWeight: 0.28767123287671237,
        });

        // Text author and maintainer
        params = parseSearchQuery('author:satazor maintainer:sindresorhus');
        expect(params).to.eql({
            text: null,
            author: 'satazor',
            maintainer: 'sindresorhus',
            scope: null,
            keywords: { include: [], exclude: [] },
            not: [],
            is: [],
            boostExact: true,
            scoreEffect: 15.3,
            qualityWeight: 0.26027397260273977,
            popularityWeight: 0.452054794520548,
            maintenanceWeight: 0.28767123287671237,
        });

        // Test keywords: include & exclude, duplicates
        params = parseSearchQuery('keywords:gulpplugin,gulpplugin,gulp,-gulpplugin,-jquery,-jquery,-jq');
        expect(params).to.eql({
            text: null,
            author: null,
            maintainer: null,
            scope: null,
            keywords: { include: ['gulpplugin', 'gulp'], exclude: ['jquery', 'jq'] },
            not: [],
            is: [],
            boostExact: true,
            scoreEffect: 15.3,
            qualityWeight: 0.26027397260273977,
            popularityWeight: 0.452054794520548,
            maintenanceWeight: 0.28767123287671237,
        });

        // Test flags: is and not, duplicates
        params = parseSearchQuery('not:deprecated,unstable is:insecure,unstable foo');
        expect(params).to.eql({
            text: 'foo',
            author: null,
            maintainer: null,
            scope: null,
            keywords: { include: [], exclude: [] },
            not: ['deprecated', 'unstable'],
            is: ['insecure'],
            boostExact: true,
            scoreEffect: 15.3,
            qualityWeight: 0.26027397260273977,
            popularityWeight: 0.452054794520548,
            maintenanceWeight: 0.28767123287671237,
        });

        // Test ranking modifiers
        params = parseSearchQuery('boost-exact:false score-effect:14 quality-weight:1 popularity-weight:1 maintenance-weight:1 foo');
        expect(params).to.eql({
            text: 'foo',
            author: null,
            maintainer: null,
            scope: null,
            keywords: { include: [], exclude: [] },
            not: [],
            is: [],
            boostExact: false,
            scoreEffect: 14,
            qualityWeight: 1 / 3,
            popularityWeight: 1 / 3,
            maintenanceWeight: 1 / 3,
        });
    });

    it('should not fail on invalid qualifiers by default', () => {
        const params = parseSearchQuery('is:foo not:bar boost-exact:foo score-effect:foo quality-weight:foo popularity-weight:foo \
maintenance-weight:foo keywords:gulp foo');

        expect(params).to.eql({
            text: 'foo',
            keywords: { include: ['gulp'], exclude: [] },
            author: null,
            maintainer: null,
            scope: null,
            not: [],
            is: [],
            boostExact: true,
            scoreEffect: 15.3,
            qualityWeight: 0.26027397260273977,
            popularityWeight: 0.452054794520548,
            maintenanceWeight: 0.28767123287671237,
        });
    });

    it('should fail if q has invalid qualifiers if options.throwOnInvalid is enabled', () => {
        expect(() => parseSearchQuery('is:foo foo', { throwOnInvalid: true })).to.throw('deprecated, unstable, insecure');
        expect(() => parseSearchQuery('not:foo foo', { throwOnInvalid: true })).to.throw('deprecated, unstable, insecure');
        expect(() => parseSearchQuery('boost-exact:foo foo', { throwOnInvalid: true })).to.throw('boolean');
        expect(() => parseSearchQuery('score-effect:foo foo', { throwOnInvalid: true })).to.throw('number');
        expect(() => parseSearchQuery('quality-weight:foo foo', { throwOnInvalid: true })).to.throw('number');
        expect(() => parseSearchQuery('popularity-weight:foo foo', { throwOnInvalid: true })).to.throw('number');
        expect(() => parseSearchQuery('maintenance-weight:foo foo', { throwOnInvalid: true })).to.throw('number');
    });

    it('should return null if no text or filter qualifiers were specified', () => {
        const params = parseSearchQuery('score-effect:1 quality-weight:1 popularity-weight:1 maintenance-weight:1 boost-exact:false');

        expect(params).to.equal(null);
    });

    describe('discardQualifiers()', () => {
        it('should discard any qualifiers', () => {
            const text = parseSearchQuery.discardQualifiers('author:satazor maintainer: boost-exact:bar foo');

            expect(text).to.equal('foo');
        });
    });
});

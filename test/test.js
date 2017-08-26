'use strict';

const nock = require('nock');
const nockBack = require('nock').back;

beforeEach(() => nock.cleanAll());
nockBack.fixtures = `${__dirname}/fixtures`;

require('./spec/util/parseSearchQuery');
require('./spec/search');
require('./spec/searchSuggestions');
require('./spec/searchSimilar');

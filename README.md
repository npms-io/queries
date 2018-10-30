# @npms/queries

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage status][codecov-image]][codecov-url] [![Dependency status][david-dm-image]][david-dm-url] [![Dev Dependency status][david-dm-dev-image]][david-dm-dev-url]

Module that offers a variety of queries around `npms` data.


## Installation

`$ npm install @npms/queries`


### Usage

For now, only queries related to `search` are available. Though, the goal of this module is to provide other interesting queries in the near future, such as top ranked modules, top authors, etc.


#### .search(q, esClient, [options]) -> Promise

Performs a search query.

Besides normal text, `q` supports qualifiers to express filters and other modifiers.
The `esClient` accepts a [`elasticsearch`](https://github.com/elastic/elasticsearch-js) instance or a config to instantiate it.

You may read the [API docs](https://api-docs.npms.io/#api-Search-ExecuteSearchQuery) to know which qualifiers are available.

```js
const queries = require('@npms/queries');

// ...
queries.search('test framework', esClient)
.then((res) => {
    console.log('total', res.total);
    console.log('results', res.results);
});
```

Available options:

- `from`: The offset in which to start searching from, defaults to `0`
- `size`: The total number of results to return, defaults to `25`
- `throwOnInvalid`: Whether to reject the promise if the query has invalid qualifiers or not, defaults to `false` (if `false`, invalid qualifiers will be removed from `q`)


#### .search.suggestions(q, esClient, [options]) -> Promise

Fetch search suggestions to be typically displayed when doing autocomplete.

Only normal text is supported in `q` but any qualifiers will be automatically discarded.
The `esClient` accepts a [`elasticsearch`](https://github.com/elastic/elasticsearch-js) instance or a config to instantiate it.

```js
const queries = require('@npms/queries');

// ...
queries.search.suggestions('gulp', esClient)
.then((suggestions) => console.log('suggestions', suggestions));
```

Available options:

- `boostExact`: How much should the score of exact matches be boosted? defaults to `100000`.
- `size`: The total number of results to return, defaults to `25`
- `analyzerWeight`: How much should we weight the analyzer's `score.final` by? defaults to `1.0`.
- `scoreWeight`: How much should we weight the search `_score`? defaults to `0.3`.

#### .search.similar(q, esClient, [options]) -> Promise

Perform a fuzzy search for similarly named packages.

Results are ranked based on a combination of analyzer weightings (`quality`, `popularity`, `maintenance`) and the `_score` returned by the [fuzzy match](https://www.elastic.co/guide/en/elasticsearch/guide/current/fuzzy-match-query.html).

```js
const queries = require('@npms/queries');

// ...
queries.search.similar('chaik', esClient)
.then(results => {
  // perhaps we were instead looking for chalk?
});
```

Available options:

- `size`: The total number of results to return, defaults to `10`.
- `analyzerWeight`: How much should we weight the analyzer's `score.final` by? defaults to `2.2`.
- `scoreWeight`: How much should we weight the search `_score`? defaults to `1.5`.
- `minScore`: defaults to `4.5`.

_the above default values were based on trial and error examining the
 top npm modules, they will likely change over time._

## Tests

`$ npm test`   
`$ npm test-cov` to get coverage report


## License

Released under the [MIT License](http://www.opensource.org/licenses/mit-license.php).


[npm-url]:https://npmjs.org/package/%40npms%2Fqueries
[downloads-image]:http://img.shields.io/npm/dm/%40npms%2Fqueries.svg
[npm-image]:http://img.shields.io/npm/v/%40npms%2Fqueries.svg
[travis-url]:https://travis-ci.org/npms-io/queries
[travis-image]:http://img.shields.io/travis/npms-io/queries/master.svg
[codecov-url]:https://codecov.io/gh/npms-io/npms-badges
[codecov-image]:https://img.shields.io/codecov/c/github/npms-io/npms-badges/master.svg
[david-dm-url]:https://david-dm.org/npms-io/queries
[david-dm-image]:https://img.shields.io/david/npms-io/queries.svg
[david-dm-dev-url]:https://david-dm.org/npms-io/queries#info=devDependencies
[david-dm-dev-image]:https://img.shields.io/david/dev/npms-io/queries.svg

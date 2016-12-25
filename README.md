# @npms/queries

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Dependency status][david-dm-image]][david-dm-url] [![Dev Dependency status][david-dm-dev-image]][david-dm-dev-url]

[npm-url]:https://npmjs.org/package/%40npms%2Fqueries
[downloads-image]:http://img.shields.io/npm/dm/%40npms%2Fqueries.svg
[npm-image]:http://img.shields.io/npm/v/%40npms%2Fqueries.svg
[travis-url]:https://travis-ci.org/npms-io/queries
[travis-image]:http://img.shields.io/travis/npms-io/queries/master.svg
[coveralls-url]:https://coveralls.io/r/npms-io/queries
[coveralls-image]:https://img.shields.io/coveralls/npms-io/queries/master.svg
[david-dm-url]:https://david-dm.org/npms-io/queries
[david-dm-image]:https://img.shields.io/david/npms-io/queries.svg
[david-dm-dev-url]:https://david-dm.org/npms-io/queries#info=devDependencies
[david-dm-dev-image]:https://img.shields.io/david/dev/npms-io/queries.svg

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

- `size`: The total number of results to return, defaults to `25`


## Tests

`$ npm test`   
`$ npm test-cov` to get coverage report


## License

Released under the [MIT License](http://www.opensource.org/licenses/mit-license.php).

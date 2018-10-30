'use strict';

const Joi = require('joi');
const normalizeNumber = require('normalize-number');
const searchQueryParser = require('search-query-parser');
const deepCompact = require('deep-compact');
const mapKeys = require('lodash/mapKeys');
const unset = require('lodash/unset');
const camelCase = require('lodash/camelCase');
const uniq = require('lodash/uniq');
const assignWith = require('lodash/assignWith');

const qualifiers = [
    'author', 'maintainer', 'scope', 'keywords', 'not', 'is', 'boost-exact',
    'score-effect', 'popularity-weight', 'quality-weight', 'maintenance-weight',
];

const paramsDefaults = {
    text: null,
    author: null,
    maintainer: null,
    scope: null,
    keywords: [],
    not: [],
    is: [],
    boostExact: true,
    scoreEffect: 13.5,
    qualityWeight: 1.9,      // ~0.27
    popularityWeight: 3.3,   // ~0.45
    maintenanceWeight: 2.1,  // ~0.28
};
const paramsSchema = Joi.object({
    text: Joi.string().trim().lowercase().min(1).max(250),                                                // trim + lowercase so that the exact boost works correctly
    author: Joi.string().trim().lowercase().min(1).max(250),                                              // trim + lowercase to mimic the raw analyzer
    scope: Joi.string().trim().lowercase().min(1).max(250),                                               // trim + lowercase to mimic the raw analyzer
    maintainer: Joi.string().trim().lowercase().min(1).max(250),                                          // trim + lowercase to mimic the raw analyzer
    keywords: Joi.array().items(Joi.string().trim().lowercase().min(1).max(50)).min(1).max(10).single(),  // trim + lowercase to mimic the raw analyzer
    not: Joi.array().items(Joi.string().trim().valid(['deprecated', 'unstable', 'insecure'])).single(),
    is: Joi.array().items(Joi.string().trim().valid(['deprecated', 'unstable', 'insecure'])).single(),
    boostExact: Joi.boolean().truthy('yes', '1', 1, 'on').falsy('no', '0', 0, 'off'),
    scoreEffect: Joi.number().min(0).max(25),
    qualityWeight: Joi.number().min(0).max(100),
    popularityWeight: Joi.number().min(0).max(100),
    maintenanceWeight: Joi.number().min(0).max(100),
}).required();
const mandatoryParams = ['text', 'author', 'maintainer', 'scope', 'keywords', 'not', 'is'];

function normalizeWeights(params) {
    const minMax = [0, params.qualityWeight + params.popularityWeight + params.maintenanceWeight];

    params.qualityWeight = normalizeNumber(minMax, params.qualityWeight);
    params.popularityWeight = normalizeNumber(minMax, params.popularityWeight);
    params.maintenanceWeight = normalizeNumber(minMax, params.maintenanceWeight);
}

function parseKeywords(params) {
    const include = [];
    const exclude = [];

    params.keywords.forEach((keyword) => {
        if (keyword.indexOf('-') === 0) {
            exclude.push(keyword.substr(1));
        } else {
            include.push(keyword);
        }
    });

    params.keywords = { include: uniq(include), exclude: uniq(exclude) };
    params.keywords.exclude = params.keywords.exclude.filter((keyword) => params.keywords.include.indexOf(keyword) === -1);
}

function uniquifyFlags(params) {
    params.not = uniq(params.not);
    params.is = uniq(params.is).filter((flag) => params.not.indexOf(flag) === -1);
}

function hasMandatoryParams(params) {
    params = deepCompact(params);

    return mandatoryParams.some((paramName) => params[paramName] != null);
}

// -------------------------------------------------

function parseSearchQuery(query, options) {
    options = Object.assign({ throwOnInvalid: false }, options);

    // Parse query into object
    query = searchQueryParser.parse(query, { keywords: qualifiers });
    query = typeof query === 'string' ? { text: query } : query;
    query = mapKeys(query, (value, key) => camelCase(key));  // CamelCase keys
    delete query.exclude;                                    // We do not use the exclusion feature from search-query-parser
    delete query.offsets;                                    // Remove `offsets` otherwise validation will fail

    // Convert & validate
    const validation = Joi.validate(query, paramsSchema, { abortEarly: options.throwOnInvalid });
    let params = validation.value;

    if (validation.error) {
        // Throw if there's an error and `options.throwOnInvalid` is enabled
        if (options.throwOnInvalid && validation.error) {
            throw validation.error;
        }

        // If `options.throwOnInvalid` is enabled, remove all failed validation props and fill it with defaults
        validation.error.details
        .reverse()
        .forEach((detail) => unset(params, detail.path));

        params = deepCompact(params);
    }

    // Fill in defaults
    params = assignWith(params, paramsDefaults, (tartgetValue, srcValue) => tartgetValue == null ? srcValue : tartgetValue);

    // Post process
    normalizeWeights(params);
    parseKeywords(params);
    uniquifyFlags(params);

    // If no mandatory params were specified (that actually filter results) then we return null
    return hasMandatoryParams(params) ? params : null;
}

function discardQualifiers(query) {
    query = searchQueryParser.parse(query, { keywords: qualifiers });

    return (typeof query === 'string' ? query : query.text || '').trim();
}

module.exports = parseSearchQuery;
module.exports.discardQualifiers = discardQualifiers;

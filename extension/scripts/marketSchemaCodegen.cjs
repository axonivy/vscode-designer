#!/usr/bin/env node

const { generateSchema, writeSrc } = require('./schemaCodegen.cjs');
const tsGen = require('json-schema-to-typescript');
const path = require('path');

tsGen.DEFAULT_OPTIONS.bannerComment = '/* eslint-disable */' + tsGen.DEFAULT_OPTIONS.bannerComment;
tsGen.DEFAULT_OPTIONS.unreachableDefinitions = true;

var schemaUri =
  'https://jenkins.ivyteam.io/job/core_json-schema/job/release%252F14.0/lastSuccessfulBuild/artifact/workspace/ch.ivyteam.ivy.market.schema/target/schema/market/14.0.0/product.json';
const tsOut = path.resolve('./src/market/generated/market-product.ts');

async function main() {
  let ts = await generateSchema(schemaUri, tsOut, 'MarketProduct');
  ts = ts.replace(/boolean & string/g, 'boolean'); // fix: indiferent importToWorkspace type
  ts = ts.replace(/projects\?:/g, 'projects:'); // fix: projects not optional
  ts = ts.replace(/data\?:(.*)/g, 'data: any | $1'); // fix: accept any type
  writeSrc(ts, tsOut);
}

main();

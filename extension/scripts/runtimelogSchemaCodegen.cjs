#!/usr/bin/env node

const { generateSchema, writeSrc } = require('./schemaCodegen.cjs');
const path = require('path');

var schemaUri =
  'https://jenkins.ivyteam.io/job/core_json-schema/job/release%252F14.0/lastSuccessfulBuild/artifact/build/schema/target/editor-ts/14.0/runtime-log-tsgen.json';
const tsOut = path.resolve('./src/views/generated/runtime-log.ts');

async function main() {
  const ts = await generateSchema(schemaUri, tsOut, 'RuntimeLog');
  let nonNullTs = ts.replace(/\?:/g, ':');
  nonNullTs = nonNullTs.replace(/:(.*) \| null/g, '?:$1');
  writeSrc(nonNullTs, tsOut);
}

main();

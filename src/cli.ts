#! /usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { Command, OptionValues } from 'commander';
import { snakeCase, camelCase, pascalCase } from 'change-case';
import { singularize, pluralize } from "inflection";
import { formatSchema } from '@prisma/sdk';
import {migrateCaseConventions, CaseChange, InflectionChange} from './migrateCaseConventions';

const DEFAULT_FILE_LOCATION = 'schema.prisma';
const program = new Command('prisma-case-format');

program
  .description(`Give your schema.prisma sane naming conventions`)
  .requiredOption('--file <file>', 'schema.prisma file location', DEFAULT_FILE_LOCATION)
  .option('--table-case <tableCase>', 'case convention for table names. allowable values: "pascal", "camel", "snake"', 'pascal')
  .option('--table-inflection <tableInflection>', 'convention for singular or plural table names. allowable values: "singular", "plural", "leave"', "leave")
  .option('--field-case <fieldCase>', 'case convention for field names. allowable values: "pascal", "camel", "snake"', 'camel')
  .option('-D, --dry-run', 'print changes to console, rather than back to file', false)
;
``
program.parse(process.argv);

run();

async function run() {
  const options = program.opts();

  if (options.dryRun) {
    console.log('***Dry run mode***');
  }

  const [fileContents, errorFile] = tryGetFileContents(options);
  if (errorFile) {
    console.error("Encountered an error while trying to read provided schema.prisma file at path " + options.file);
    console.error(errorFile.message);
    process.exit(1);
  }

  let [tableCaseConvention, errorTableCase] = tryGetTableCaseConvention(options.tableCase);
  if (errorTableCase) {
    console.warn(`Warning: encountered unsupported case convention: "${options.fieldCase}". Defaulting to "pascal" case.`);
    [tableCaseConvention,] = tryGetTableCaseConvention('pascal');
  }

  let [tableInflectionConvention, errorTableInflection] = tryGetTableInflectionConvention(options.tableInflection);
  if (errorTableInflection) {
    console.warn(`Warning: encountered unsupported inflection convention: "${options.tableInflection}". Defaulting to "leave".`);
    [tableInflectionConvention,] = tryGetTableInflectionConvention('leave');
  }

  let [fieldCaseConvention, errorFieldCase] = tryGetTableCaseConvention(options.fieldCase);
  if (errorFieldCase) {
    console.warn(`Warning: encountered unsupported case convention: "${options.fieldCase}". Defaulting to "camel" case.`);
    [fieldCaseConvention,] = tryGetTableCaseConvention('camel');
  }

  const [schema, errorSchema] = migrateCaseConventions(fileContents!, tableCaseConvention!, fieldCaseConvention!, tableInflectionConvention!);
  if (errorSchema) {
    console.error('Encountered error while migrating case conventions');
    console.error(errorSchema);
    process.exit(1);
  }

  const newSchema = await formatSchema({ schema: schema! });

  if (options.dryRun) {
    console.log('Prettify yielded the following schema:');
    console.log(newSchema);
    process.exit(0);
  }
  writeFileSync(options.file, Buffer.from(newSchema), { encoding: 'utf8' });
  console.log('✨ Done.')
}

export function tryGetFileContents(options: OptionValues): [string?, Error?] {
  const filePath = options.file;
  try {
    const contents = String(readFileSync(filePath));
    return [contents, ];
  } catch (error) {
    return [, error as Error];
  }
}

export function tryGetTableCaseConvention(type: string): [CaseChange?, Error?] {
  switch(type) {
    case 'pascal': return [pascalCase,];
    case 'camel': return [camelCase,];
    case 'snake': return [snakeCase,];
    default: return [, new Error('unsupported case convention: ' + type)];
  }
}

export function tryGetTableInflectionConvention(type: string): [InflectionChange?, Error?] {
  switch(type) {
    case 'singular': return [singularize,];
    case 'plural': return [pluralize,];
    case 'leave': return [(str) => str,];
    default: return [, new Error('unsupported inflection: ' + type)];
  }
}

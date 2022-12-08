import { expect, test } from '@jest/globals';
import { camelCase, pascalCase } from 'change-case';
import { singularize } from "inflection";
import { migrateCaseConventions } from './migrateCaseConventions';

test('it can map table names and column names', () => {
  const file_contents = `datasource db {
  provider = "sqlite"
  url      = "file:database.db"
}

// generator
generator client {
  provider = "prisma-client-js"
}

model demos {
  article_id Int
}`;
  const result = `datasource db {
  provider = "sqlite"
  url      = "file:database.db"
}

// generator
generator client {
  provider = "prisma-client-js"
}

model Demo {
  @@map("demos")
  articleId Int @map("article_id")
}`;
  const [schema, error] = migrateCaseConventions(file_contents, pascalCase, camelCase, singularize);
  expect(error).toBeFalsy();
  expect(schema).toEqual(result);
});

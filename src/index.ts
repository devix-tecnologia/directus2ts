#!/usr/bin/env node

import { writeFile } from "fs/promises";
import { resolve } from "path";

import { snakeCase } from "change-case";
import axios from "axios";
import { z } from "zod";
import yargs from "yargs";
import openApiTs, { OpenAPI3 } from "openapi-typescript";

const Argv = z.object({
  host: z.string(),
  token: z.string(),
  typeName: z.string(),
  specOutFile: z.string().nullish(),
  outFile: z.string(),
  simplified: z.boolean().nullish(),
});

type Argv = z.infer<typeof Argv>;

const main = async (): Promise<void> => {
  const argv = Argv.parse(
    await yargs(process.argv.slice(2))
      .option(`host`, { demandOption: true, type: `string` })
      .option(`token`, { demandOption: true, type: `string` })
      .option(`typeName`, { demandOption: true, type: `string` })
      .option(`specOutFile`, { demandOption: false, type: `string` })
      .option(`outFile`, { demandOption: true, type: `string` })
      .option(`simplified`, { demandOption: false, type: `boolean` })
      .help().argv
  );

  const { host, token, simplified, typeName, specOutFile, outFile } = argv;

  const response = await axios.get(`${host}/server/specs/oas`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const spec: any = response.data;

  if (simplified) {
    delete spec.components.parameters;
    delete spec.components.tags;
    delete spec.components.responses;
    delete spec.components.securitySchemes;
    delete spec.components.Auth;
    delete spec.components.schemas.Query;
    delete spec.components.schemas.Activity;
    delete spec.components.schemas.Collections;
    delete spec.components.schemas.Fields;
    delete spec.components.schemas.Permissions;
    delete spec.components.schemas.Presets;
    delete spec.components.schemas.Relations;
    delete spec.components.schemas.Revisions;
    delete spec.components.schemas.Settings;
    delete spec.components.schemas.Operations;
    delete spec.components.schemas.Webhooks;
    delete spec.components.schemas.Flows;
    delete spec.components.schemas["x-metadata"];
    delete spec.operations;
    delete spec.external;
    delete spec.webhooks;
    delete spec.paths;
  }

  if (specOutFile) {
    await writeFile(
      resolve(process.cwd(), specOutFile),
      JSON.stringify(spec, null, 2),
      {
        encoding: `utf-8`,
      }
    );
  }

  const baseSource = await openApiTs(spec as OpenAPI3, {
    commentHeader: "",
  });

  const itemPattern = /^    Items([^\:]*)/;

  const exportProperties = baseSource
    .split(`\n`)
    .map((line) => {
      const match = line.match(itemPattern);
      if (!match) {
        return null;
      }
      const [, collectionName] = match;
      const propertyKey = snakeCase(collectionName);
      return `  ${propertyKey}: components["schemas"]["Items${collectionName}"];`;
    })
    .filter((line): line is string => typeof line === `string`)
    .join(`\n`);

  const exportSource = `export type ${typeName} = {\n${exportProperties}\n};`;

  const header = "/** \n Arquivo gerado automaticamente pelo Directus2TS \n */";
  const source = [header, exportSource, baseSource].join(`\n`);

  await writeFile(resolve(process.cwd(), outFile), source, {
    encoding: `utf-8`,
  });
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  throw new Error(`This should be the main module.`);
}

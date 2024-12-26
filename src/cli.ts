#!/usr/bin/env node

import { resolve } from "path";
import axios from "axios";
import { createTsFile, simplifySpec, writeSpecFile } from "./lib.js";
import openApiTs from "openapi-typescript";
import type { OpenAPI3 } from "openapi-typescript";
import yargs from "yargs";
import { z } from "zod";
import * as ts from 'typescript';

// Type Definitions
const ArgSchema = z.object({
  host: z.string().describe("Host where the directus api is hosted"),
  token: z.string().describe("Access token to the api. Typing will be based on the permissions enabled to this token"),
  typeName: z.string().describe("Name to group all collections inside a global type"),
  specOutFile: z.string().nullish().describe("Optional path to write the OpenAPI spec file"),
  outFile: z.string().describe("Path to write the .ts output file"),
  simplified: z.boolean().optional().describe("Simplify types by removing directus system collections"), // Changed from nullish to optional
  prefix: z.string().default("").describe("Optional prefix added to every collection type"),
});

type Args = z.infer<typeof ArgSchema>;

// Configuration
export const configureYargs = () => 
  yargs(process.argv.slice(2))
    .option('host', { demandOption: true, type: 'string', description: ArgSchema.shape.host.description })
    .option('token', { demandOption: true, type: 'string', description: ArgSchema.shape.token.description })
    .option('typeName', { demandOption: true, type: 'string', description: ArgSchema.shape.typeName.description })
    .option('specOutFile', { demandOption: false, type: 'string', description: ArgSchema.shape.specOutFile.description })
    .option('outFile', { demandOption: true, type: 'string', description: ArgSchema.shape.outFile.description })
    .option('simplified', { demandOption: false, type: 'boolean', description: ArgSchema.shape.simplified.description })
    .option('prefix', { 
      demandOption: false, 
      type: 'string', 
      description: ArgSchema.shape.prefix.description,
      default: "" 
    })
    .help();

// API Functions
export const fetchOpenApiSpec = async (host: string, token: string) => {
  const response = await axios.get(`${host}/server/specs/oas`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const processOpenApiSpec = async (
  spec: OpenAPI3,
  options: { 
    simplified?: boolean; 
    specOutFile?: string | null;
  }
): Promise<string> => {
  let processedSpec = options.simplified ? simplifySpec(spec) : spec;

  if (options.specOutFile) {
    const specPath = resolve(process.cwd(), options.specOutFile);
    await writeSpecFile(specPath, processedSpec);
  }

  // Convert OpenAPI spec to TypeScript
  const tsNodes = await openApiTs(processedSpec as OpenAPI3);
  
  // Convert TypeScript nodes to string
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const sourceFile = ts.createSourceFile(
    'temp.ts',
    '',
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS
  );

  return printer.printList(
    ts.ListFormat.MultiLine,
    ts.factory.createNodeArray(tsNodes),  // Using factory.createNodeArray instead
    sourceFile
  );
};

// Main Function
export const main = async (): Promise<void> => {
  try {
    const argv = ArgSchema.parse(await configureYargs().argv);
    
    const spec = await fetchOpenApiSpec(argv.host, argv.token);
    
    const baseSource = await processOpenApiSpec(spec, {
      simplified: argv.simplified ?? false, // Add null coalescing operator
      specOutFile: argv.specOutFile,
    });

    const tsPath = resolve(process.cwd(), argv.outFile);
    createTsFile(argv.typeName, baseSource, tsPath, argv.prefix);
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
};

// Execute
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
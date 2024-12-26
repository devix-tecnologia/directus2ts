import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import * as lib from './lib.js'
import yargs from 'yargs'
import openApiTs from 'openapi-typescript'
import { configureYargs, fetchOpenApiSpec, processOpenApiSpec, main } from './cli.js'
import * as ts from 'typescript'
import type { OpenAPI3 } from 'openapi-typescript'

vi.mock('axios')
vi.mock('./lib.js')
vi.mock('yargs')
vi.mock('openapi-typescript')

const mockOpenApiSpec: OpenAPI3 = {
 openapi: '3.0.0',
 info: {
   title: 'Test API',
   version: '1.0.0'
 },
 paths: {},
 components: {}
}

const mockTypeNode = ts.factory.createTypeAliasDeclaration(
 [],
 'Test',
 undefined,
 ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
)

const createYargsMock = (args: object) => ({
 option: function() { return this },
 help: function() { return this },
 argv: Promise.resolve(args)
})

describe('CLI', () => {
 beforeEach(() => {
   vi.clearAllMocks()
 })

 it('validates arguments correctly', async () => {
   const mockArgs = {
     host: 'http://test.com',
     token: 'test-token',
     typeName: 'TestType',
     outFile: 'output.ts',
     simplified: true,
     prefix: 'test_'
   }

   vi.mocked(yargs).mockReturnValue(createYargsMock(mockArgs) as any)
   const argv = await configureYargs().argv
   expect(argv).toEqual(mockArgs)
 })

 it('fetches OpenAPI spec successfully', async () => {
   vi.mocked(axios.get).mockResolvedValue({ data: mockOpenApiSpec })
   const spec = await fetchOpenApiSpec('http://test.com', 'test-token')

   expect(axios.get).toHaveBeenCalledWith(
     'http://test.com/server/specs/oas',
     { headers: { Authorization: 'Bearer test-token' } }
   )
   expect(spec).toEqual(mockOpenApiSpec)
 })

 it('processes OpenAPI spec with simplification', async () => {
   vi.mocked(lib.simplifySpec).mockReturnValue(mockOpenApiSpec)
   vi.mocked(openApiTs).mockResolvedValue([mockTypeNode])

   await processOpenApiSpec(mockOpenApiSpec, {
     simplified: true,
     specOutFile: 'spec.json'
   })

   expect(lib.simplifySpec).toHaveBeenCalledWith(mockOpenApiSpec)
   expect(lib.writeSpecFile).toHaveBeenCalled()
 })

 it('handles main function execution', async () => {
   const mockArgs = {
     host: 'http://test.com',
     token: 'test-token',
     typeName: 'TestType',
     outFile: 'output.ts',
     simplified: true,
     prefix: 'test_'
   }

   vi.mocked(yargs).mockReturnValue(createYargsMock(mockArgs) as any)
   vi.mocked(axios.get).mockResolvedValue({ data: mockOpenApiSpec })
   vi.mocked(lib.simplifySpec).mockReturnValue(mockOpenApiSpec)
   vi.mocked(openApiTs).mockResolvedValue([mockTypeNode])

   await main()
   expect(lib.createTsFile).toHaveBeenCalled()
 })

 it('handles errors gracefully', async () => {
  // Mock yargs primeiro
  const mockArgs = {
    host: 'http://test.com',
    token: 'test-token',
    typeName: 'TestType',
    outFile: 'output.ts'
  }
  vi.mocked(yargs).mockReturnValue({
    option: function() { return this },
    help: function() { return this },
    argv: Promise.resolve(mockArgs)
  } as any)

  vi.mocked(axios.get).mockRejectedValue(new Error('API Error'))
  const consoleSpy = vi.spyOn(console, 'error')
  const processSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

  await main()
  expect(consoleSpy).toHaveBeenCalledWith('Error:', 'API Error')
  expect(processSpy).toHaveBeenCalledWith(1)
})
}, { timeout: 10000 })
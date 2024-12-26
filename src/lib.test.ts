import { describe, it, expect, vi, beforeEach } from 'vitest'
import { writeFile } from 'fs/promises'
import { simplifySpec, writeSpecFile, getExportProperties, createTsFile } from './lib.js'



vi.mock('fs/promises')

describe('lib functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should simplify OpenAPI spec', () => {
    const mockSpec = {
      components: {
        parameters: {},
        tags: {},
        responses: {},
        securitySchemes: {},
        Auth: {},
        schemas: {
          Query: {},
          Activity: {},
          Collections: {},
          Fields: {},
          Permissions: {},
          Presets: {},
          Relations: {},
          Revisions: {},
          Settings: {},
          Operations: {},
          Webhooks: {},
          Flows: {},
          'x-metadata': {},
          CustomSchema: {}
        }
      },
      operations: {},
      external: {},
      webhooks: {},
      paths: {}
    }

    const simplified = simplifySpec(mockSpec)
    expect(simplified.components.schemas).toEqual({ CustomSchema: {} })
  })

  it('should write spec file', async () => {
    const mockSpec = { test: 'data' }
    await writeSpecFile('test.json', mockSpec)
    expect(writeFile).toHaveBeenCalledWith(
      'test.json',
      JSON.stringify(mockSpec, null, 2),
      { encoding: 'utf-8' }
    )
  })

  it('should get export properties', () => {
    const baseSource = '    Items: string;'
    console.log('Raw return:', getExportProperties(baseSource, 'prefix_'))
  })
  
  it('should create TS file', async () => {
    const mockBaseSource = '    Items: string;'
    await createTsFile('TestType', mockBaseSource, 'output.ts', 'prefix_')
  
    const lastCall = vi.mocked(writeFile).mock.lastCall
    console.log('WriteFile content:', JSON.stringify(lastCall?.[1], null, 2))
  })
}, { timeout: 10000 })
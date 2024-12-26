import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { readFileSync, unlinkSync } from 'fs'
import { resolve } from 'path'

describe('CLI Integration', () => {
  const outputFile = resolve(__dirname, '../test-output.ts')
  const specFile = resolve(__dirname, '../spec.json')

  beforeAll(() => {
    try {
        console.log('Starting Directus...');
        // Subindo o Directus com o docker-compose
        execSync('docker compose -f docker-compose.test.yml up -d', { stdio: 'inherit' });
    
        console.log('Directus started.');
      } catch (error) {
        console.error('Error starting Directus:', error);
        throw error;
      }
  })

  afterAll(() => {
    try {
        console.log('Stopping and cleaning up Directus...');
        // Derrubando os containers e removendo volumes
        execSync('docker compose -f docker-compose.test.yml down -v', { stdio: 'inherit' });
    
        console.log('Directus stopped and volumes removed.');
      } catch (error) {
        console.error('Error cleaning up Directus:', error);
        throw error;
      }
  })

  it('should generate types from API', () => {
    const command = `node dist/cli.js --host="https://demo.directus.io" --token="your_token" --typeName="DirectusTypes" --outFile="${outputFile}" --specOutFile="${specFile}" --simplified=true`
    
    execSync(command)

    const generatedTypes = readFileSync(outputFile, 'utf-8')
    const generatedSpec = readFileSync(specFile, 'utf-8')

    expect(generatedTypes).toContain('export type DirectusTypes')
    expect(JSON.parse(generatedSpec)).toHaveProperty('components.schemas')
  })
})
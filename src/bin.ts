import { generateEnvTypes } from './bun.plugin'

console.log('generating types from all .env files in the project...')
await generateEnvTypes()
console.log('types generated successfully!')

import { generateEnvTypes } from './plugin'
import { getEnvFiles } from './utils'

console.log('generating types from all .env files in the project...')
const envFiles = await getEnvFiles(new Bun.Glob('.env*'), ['.env.example'])
if (envFiles.length === 0) {
	console.log('no .env files found')
	process.exit(1)
}

await generateEnvTypes({ envFiles })
console.log('types generated successfully!')

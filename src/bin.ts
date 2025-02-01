import { generateEnvTypes } from './plugin'
import { getEnvFiles } from './utils'

console.log('generating types from all .env files in the project...')
const existingDtsFile = Bun.file('env.d.ts')
if (await existingDtsFile.exists()) {
	console.log('env.d.ts file already exists, overwrite? (y/n)')
	const overwrite =
		await Bun.$`read -p "Enter your choice: " overwrite && echo $overwrite`.text()
	if (overwrite !== 'y') {
		console.log('exiting...')
		process.exit(1)
	}
}
const envFiles = await getEnvFiles(new Bun.Glob('.env*'), ['.env.example'])

await generateEnvTypes({ envFiles })
console.log('types generated successfully!')

import { stdin, stdout } from 'node:process'
import * as readline from 'node:readline'
import { generateEnvTypes } from './plugin'
import { getEnvFiles } from './plugin-utils'

console.log('\x1b[34mchecking if env.d.ts file exists...\x1b[0m')

const envFiles = await getEnvFiles(new Bun.Glob('.env*'), ['.env.example'])
if (envFiles.length === 0) {
	console.log('\x1b[31mno .env files found\x1b[0m')
	process.exit(1)
}

let outfile = process.argv[2] || 'env.d.ts'
const existingDtsFile = Bun.file(outfile)
const fileExists = await existingDtsFile.exists()

if (fileExists) {
	const answer = await new Promise<string>((resolve) => {
		readline
			.createInterface({
				input: stdin,
				output: stdout,
			})
			.question(`${outfile} already exists, overwrite? (y/n)`, resolve)
	})

	if (answer.trim().toLowerCase() !== 'y') {
		console.log('\x1b[34mgenerating new env.d.ts file...\x1b[0m')
		outfile = `env-${new Date().toISOString()}.d.ts`
		process.exit(0)
	} else {
		console.log('\x1b[33moverwriting env.d.ts file...\x1b[0m')
	}
}

await generateEnvTypes({ envFiles, outFile: outfile })
console.log(
	`\x1b[34mtypes generated successfully!\x1b[0m\n\x1b[32m${outfile}\x1b[0m`,
)

process.exit(0)

import { stdin, stdout } from 'node:process'
import * as readline from 'node:readline'
import { generateEnvTypes } from './plugin'
import { getEnvFiles } from './plugin-utils'

/**
 * CLI for the bun-plugin-env-types plugin.
 *
 * Usage:
 *
 * ```sh
 * bunx bun-plugin-env-types [options] [file]
 * ```
 *
 * Options:
 *
 * - `--env <environment>`: Use a specific environment file.
 * - `--outfile <file>`: Output file name.
 * - `--overwrite`: Automatically overwrite existing files without prompting.
 * - `--import-meta-env`: Put definitions under `ImportMetaEnv` instead of `NodeJS.ProcessEnv`.
 *
 * Examples:
 *
 * ```sh
 * bunx bun-plugin-env-types --env production
 * bunx bun-plugin-env-types --outfile vite.d.ts --env development
 * bunx bun-plugin-env-types --overwrite --env local
 * bunx bun-plugin-env-types --import-meta-env --outfile vite-env.d.ts
 * ```
 */

/**
 * Prints the help menu for the CLI and exits the process.
 */
function printHelpAndExit() {
	console.log(
		'\x1b[36m\nUsage:\x1b[0m\n' +
			'  bunx bun-plugin-env-types [options] [file]\n\n' +
			'\x1b[36mOptions:\x1b[0m\n' +
			'  --env <environment>   Use a specific environment file\n' +
			'  --outfile <file>     Output file name (default: env.d.ts)\n' +
			'  --overwrite          Automatically overwrite existing files without prompting\n' +
			'  --import-meta-env    Put definitions under ImportMetaEnv instead of NodeJS.ProcessEnv\n' +
			'  --help               Show this help menu\n\n' +
			'\x1b[36mExamples:\x1b[0m\n' +
			'  bunx bun-plugin-env-types --env production\n' +
			'  bunx bun-plugin-env-types --outfile vite.d.ts --env development\n' +
			'  bunx bun-plugin-env-types --overwrite --env local\n' +
			'  bunx bun-plugin-env-types --import-meta-env --outfile vite-env.d.ts\n',
	)
	process.exit(0)
}

// Parse command line arguments
const args = process.argv.slice(2)
// Show help menu if --help is present
if (args.includes('--help') || args.includes('-h')) {
	printHelpAndExit()
}
let outfile = 'env.d.ts'
let envFilter: string | undefined
let overwrite = false
let importMetaEnv = false

console.log({ args })

// Parse arguments, grouping env flag with its value
for (let i = 0; i < args.length; i++) {
	const arg = args[i]
	// checks the flag and its value
	if (arg === '--env' && i + 1 < args.length) {
		const nextArg = args[i + 1]
		if (nextArg) {
			envFilter = nextArg
			i++ // Skip the next argument as it's the value for --env
		}
	} else if (arg === '--overwrite') {
		overwrite = true
	} else if (arg === '--import-meta-env') {
		importMetaEnv = true
	} else if (arg === '--outfile' && i + 1 < args.length) {
		// Handle --outfile flag followed by filename
		const nextArg = args[i + 1]
		if (nextArg && !nextArg.startsWith('--')) {
			outfile = nextArg
			i++ // Skip the next argument as it's the value for --outfile
		}
	} else if (arg && !arg.startsWith('--')) {
		// If no prefix, treat as outfile (backward compatibility)
		outfile = arg
	}
}

console.log('\x1b[34mchecking if env.d.ts file exists...\x1b[0m')

// Get env files
const envGlob = new Bun.Glob('.env*')
let envFiles = await getEnvFiles(envGlob, ['.env.example'])

// Filter env files if environment flag is provided
if (envFilter) {
	envFiles = envFiles.filter((file) => file === `.env.${envFilter}`)
}

if (envFiles.length === 0) {
	let logMessage = '\x1b[31mno .env files found\x1b[0m'
	if (envFilter) {
		logMessage = `\x1b[31mno .env.${envFilter} files found\x1b[0m`
	}
	console.log(logMessage)
	process.exit(1)
}

const existingDtsFile = Bun.file(outfile)
const fileExists = await existingDtsFile.exists()

if (fileExists && !overwrite) {
	const answer = await new Promise<string>((resolve) => {
		readline
			.createInterface({
				input: stdin,
				output: stdout,
			})
			.question(`${outfile} already exists, overwrite? (y/n) `, resolve)
	})

	if (answer.trim().toLowerCase() !== 'y') {
		console.log('\x1b[34mgenerating new env.d.ts file...\x1b[0m')
		outfile = `env-${new Date().toISOString()}.d.ts`
		process.exit(0)
	} else {
		console.log('\x1b[33moverwriting env.d.ts file...\x1b[0m')
	}
} else if (fileExists && overwrite) {
	console.log(
		`\x1b[33moverwriting ${outfile} file (--overwrite flag detected)...\x1b[0m`,
	)
}

await generateEnvTypes({ envFiles, outFile: outfile, importMetaEnv })
console.log(
	`\x1b[34mtypes generated successfully!\x1b[0m\n\x1b[32m${outfile}\x1b[0m`,
)

process.exit(0)

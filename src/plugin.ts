import type { BunPlugin } from 'bun'
import { getEnvFiles, writeToEnvDts } from './plugin-utils'

export type PluginOptions = {
	/**
	 * The .env files to add to the env.d.ts file.
	 * If not provided, the plugin will search for .env files using the `glob` option.
	 * _Notes:_ If you provide this option, the `glob` option will be ignored.
	 * @default undefined
	 */
	envFiles?: string[]
	/**
	 * Change the name of the generated output ts/d.ts file
	 * @default 'env.d.ts'
	 */
	outFile?: string
	/**
	 * The glob pattern to search for .env files
	 * @default '.env*'
	 */
	glob?: string
	/**
	 * Generate a timestamp at the top of the env.d.ts file so you know when each build occurs
	 * @default true
	 */
	timestamp?: boolean
	/**
	 * .env files to ignore
	 * @default
	 * ['.env.example']
	 */
	ignore?: string[]
	/**
	 * Verbose logs for debugging
	 */
	verbose?: boolean
	/**
	 * Put the definitions under `ImportMetaEnv` instead of `NodeJS.ProcessEnv`.
	 * _Note:_ You probably dont need this in Bun environments where `ImportMetaEnv` is same as `NodeJS.ProcessEnv`
	 */
	importMetaEnv?: boolean
}

type FullOptions = Required<Omit<PluginOptions, 'envFiles'>> &
	Pick<PluginOptions, 'envFiles'>

/**
 * Generate type definitions for all .env files in the project.
 *
 * Scans the project for .env files using `Bun.glob`, then inserts them into a env.d.ts file under the `NodeJS.ProcessEnv` (or `ImportMetaEnv`) namespace.
 *
 * You can add your own custom global types to the env.d.ts file by adding them below the generated type dets.
 * @param pluginOpts - optional plugin configuration
 *
 * @example
 * create `preload.ts`, import the plguin, and call it in the file:
 * ```ts
 * // preload.ts
 * import envPlugin from 'bun-plugin-env-types'
 *
 * envPlugin()
 * ```
 * then add the file to bunfig.toml under `preload`:
 * ```toml
 * # bunfig.toml
 * preload = ["./preload.ts"]
 * ```
 *
 * @example
 * Or you can use the plugin in a build script:
 * ```ts
 * // build.ts
 * import envPlugin from 'bun-plugin-env-types'
 *
 * const build = await Bun.build({
 *    entrypoints: ['./build.ts'],
 *    plugins: [envPlugin()],
 * })
 * ```
 */
export default function (pluginOpts?: PluginOptions): BunPlugin {
	return {
		name: 'bun-plugin-env-types',
		setup: async () => generateEnvTypes(pluginOpts),
	}
}

/**
 * Generate type definitions for all .env files in the project.
 * @param pluginOpts - optional plugin configuration
 */
export async function generateEnvTypes(pluginOpts?: PluginOptions) {
	const mergedOpts = mergeOptions(pluginOpts)
	const envGlob = new Bun.Glob(mergedOpts.glob)
	const envFiles =
		mergedOpts.envFiles ?? (await getEnvFiles(envGlob, mergedOpts.ignore))

	mergedOpts.verbose && console.log({ options: { ...mergedOpts, envFiles } })

	if (envFiles.length === 0) {
		mergedOpts.verbose &&
			console.log(
				'\x1b[38;5;222m No .env files found. Please add a .env file to the project, or provide the `envFiles` option to the plugin.\x1b[0m',
			)
		return
	}

	// store the type definitions for each .env file
	const newTypeDefs = new Map<string, string>()

	for await (const file of envFiles) {
		const envContent = await Bun.file(file).text()
		// filter out comments and empty lines
		const filtered = envContent
			.split('\n')
			.filter((line) => line.trim() !== '' && !line.trim().startsWith('#'))
		for (const line of filtered) {
			const [key, value] = line.split('=')
			if (!key || !value) continue
			// Remove 'export' keyword if present and trim whitespace
			const cleanKey = key.trim().replace(/^export\s+/, '')
			newTypeDefs.set(cleanKey, 'string')
		}
	}

	if (newTypeDefs.size === 0) {
		console.warn(
			'no env variables found in .env files, with the given plugin options',
		)
	}

	mergedOpts.verbose && console.log({ $ENV: newTypeDefs })

	// our env.d.ts file is not 'created' until it is read at least once (lazily loaded)
	const envDtsFile = Bun.file(mergedOpts.outFile)

	// allow for modifying the output file - favor the existing type defs if they exist
	const existingDtsContent =
		(await envDtsFile
			.text()
			.catch(() =>
				console.log('no existing env.d.ts... generating a new one'),
			)) ?? null

	const existingTypeDefs = existingDtsContent
		? getExistingTypeDefs(existingDtsContent, mergedOpts.verbose)
		: new Map<string, string>()

	if (existingTypeDefs.size > 0) {
		for (const [key, value] of existingTypeDefs) {
			newTypeDefs.set(key, value as string)
		}
	}

	mergedOpts.verbose && console.log({ typeDefinitions: newTypeDefs })

	const outFile = await writeToEnvDts({
		typeDefs: newTypeDefs,
		timestamp: mergedOpts.timestamp,
		envDtsFile,
		importMetaEnv: mergedOpts.importMetaEnv,
	})
	if (outFile && mergedOpts.verbose) {
		console.log(`\x1b[38;5;226m${outFile.name} created\x1b[0m`)
	}
}

/**
 * Merge the plugin options with the default options
 * @param pluginOpts
 */
function mergeOptions(pluginOpts: PluginOptions | undefined): FullOptions {
	const defaults: FullOptions = {
		outFile: 'env.d.ts',
		glob: '.env*',
		timestamp: true,
		ignore: ['.env.example'],
		envFiles: undefined,
		verbose: false,
		importMetaEnv: false,
	}
	// just in case the user provides an option that is undefined
	const definedOptions: PluginOptions = pluginOpts
		? Object.fromEntries(
				Object.entries(pluginOpts).map(([key, value]) => [
					key,
					value === undefined ? defaults[key as keyof PluginOptions] : value,
				]),
			)
		: defaults
	const mergedOpts = { ...defaults, ...definedOptions } satisfies FullOptions
	return mergedOpts
}

/**
 * Get the existing type definitions from the contents of the env.d.ts file
 * @param content - the file contents of the env.d.ts file as a string
 * @param verbose - verbose logging
 */
function getExistingTypeDefs(
	content: string,
	verbose = false,
): Map<string, string> {
	try {
		const processEnvString = 'export interface ProcessEnv {'
		const processEnvStart = content.indexOf(processEnvString)
		const processEnvEnd = content.indexOf('}', processEnvStart)
		const processEnvContent = content.slice(
			processEnvStart + processEnvString.length,
			processEnvEnd,
		)

		const typeDefinitions = new Map<string, string>()
		// Split the content by new lines and filter out empty lines or comments
		for (const line of processEnvContent.split('\n')) {
			const trimmedLine = line.trim()
			if (trimmedLine && !trimmedLine.startsWith('//')) {
				const [key, value] = trimmedLine.split(':')
				if (!key || !value) continue
				typeDefinitions.set(key.trim(), value.trim())
			}
		}

		verbose && console.log({ existingTypeDefs: typeDefinitions })

		return typeDefinitions
	} catch (error) {
		console.error('Error reading existing type definitions:', error)
		return new Map()
	}
}

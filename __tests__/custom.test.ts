import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import envPlugin, { PluginOptions } from '../src/bun.plugin'
import { getEnvFiles } from '../src/utils'
import { TempBunDir, TempBunFile } from './utils'

export type FullOptions = Required<Omit<PluginOptions, 'envFiles'>> &
	Pick<PluginOptions, 'envFiles'>

describe('custom options', async () => {
	const TEMP_DIR = 'tmp'
	let customOptions: FullOptions
	let envValidPath: string
	let envFiles: string[]
	beforeEach(async () => {
		await using envTestIgnore = await TempBunFile.create({
			path: '.env.test.ignore',
			contents: 'IGNORED_VAR=ignored',
		})
		await using envTestExample = await TempBunFile.create({
			path: '.env.test.example',
			contents: 'EXAMPLE_VAR=example',
		})
		await using envTestValid = await TempBunFile.create({
			path: '.env.test',
			contents: 'VALID_VAR=valid',
		})
		envValidPath = envTestValid.path
		console.log({ envValidPath })
		customOptions = {
			dtsFile: 'env.alt.d.ts', // this will be created after Bun.build
			glob: '.env.test*',
			ignore: [envTestIgnore.path, envTestExample.path],
			timestamp: false,
			verbose: true,
		} satisfies FullOptions

		await using tempDir = await TempBunDir.create(TEMP_DIR)
		const entry = await tempDir.addShellFile({
			name: 'entry.ts',
			contents: 'const hiThere = "hi there"\nconsole.log(hiThere)\n',
		})
		await Bun.build({
			entrypoints: [entry.filePath],
			plugins: [envPlugin(customOptions)],
			outdir: tempDir.path,
		})
		// 'create' the temp files by reading them
		envFiles = await getEnvFiles(
			new Bun.Glob(customOptions.glob),
			customOptions.ignore,
		)
	})

	afterEach(async () => {
		await Bun.$`rm ${customOptions.dtsFile}`.quiet()
	})

	test('should build the env.alt.d.ts file', async () => {
		expect(await Bun.file(customOptions.dtsFile).text()).toBeTypeOf('string')
	})

	test('ignore values', async () => {
		const contents = await Bun.file(customOptions.dtsFile).text()
		expect(contents).not.toInclude('IGNORED_VAR: string')
		expect(contents).not.toInclude('EXAMPLE_VAR: string')
	})
	test('should not have a timestamp', async () => {
		const contents = await Bun.file(customOptions.dtsFile).text()
		expect(contents).not.toInclude('// Generated by Bun plugin at')
	})
	test('glob should only include .env.test', async () => {
		expect(envFiles).toHaveLength(1)
	})
})

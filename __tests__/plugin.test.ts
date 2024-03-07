import { beforeEach, describe, expect, test } from 'bun:test'
import envPlugin from '../bun.plugin'
import { TempBunFile } from './utils'

describe.skip('default plugin options', async () => {
	await using tempEntry = await TempBunFile.create({
		path: 'tmp/entry.ts',
		contents: 'const hiThere = "hi there!"\nconsole.log(hiThere)\n',
	})

	beforeEach(async () => {
		await using tempEnv = await TempBunFile.create({
			path: '.env',
			contents: 'SOME_VAR=some_var',
		})
		await using tempExampleEnv = await TempBunFile.create({
			path: '.env.example',
			contents: 'EXAMPLE_VAR=example',
		})
		console.log('running beforeAll 1')
		// create .env, .env.example, .env.test
		const out = await Bun.build({
			entrypoints: [tempEntry.path],
			plugins: [envPlugin({ verbose: true })], // will produce env.d.ts
			outdir: 'tmp',
		})
	})

	test('should build the temp entry file', async () => {
		expect(await tempEntry.file.exists()).toBe(true)
	})
	test('should build the (not temp) env.d.ts file', async () => {
		expect(await Bun.file('env.d.ts').text()).toBeTruthy()
	})
	test('should ignore .env.example', async () => {
		const contents = await Bun.file('env.d.ts').text()
		expect(contents).not.toContain('EXAMPLE_VAR: string')
	})
})

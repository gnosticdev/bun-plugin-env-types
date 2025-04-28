import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from 'bun:test'
import type { ShellOutput } from 'bun'
import { TempBunFile } from './utils'

describe('binary executable version', async () => {
	const DTS_FILE = 'env.d.ts'
	let binOutput: ShellOutput

	beforeAll(async () => {
		await Bun.$`bun build ./src/bin.ts --compile --outfile ./dist/bin`
	})
	beforeEach(async () => {
		await using __tempEnv = await TempBunFile.create({
			filePath: '.env',
			contents: 'SOME_VAR=some_var',
		})
		await using __tempEnvEx = await TempBunFile.create({
			filePath: '.env.example',
			contents: 'EXAMPLE_VAR=example',
		})
		binOutput = await Bun.$`./dist/bin`.throws(true)
	})
	afterEach(async () => {
		await Bun.$`rm -rf ${DTS_FILE}`
	})
	test('should build the (not temp) env.d.ts file', async () => {
		const dtsText = await Bun.file(DTS_FILE).text().catch(console.error)
		expect(dtsText).toBeString()
	})
	test('should ignore .env.example', async () => {
		const contents = await Bun.file(DTS_FILE).text()
		expect(contents).not.toContain('EXAMPLE_VAR: string')
	})
})

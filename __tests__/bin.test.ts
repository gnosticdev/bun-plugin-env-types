import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { TempBunFile, type ShellFile } from './utils'

describe('binary executable version', async () => {
	const DTS_FILE = 'env.d.ts'
	let tempEntry: ShellFile
	beforeEach(async () => {
		await using __tempEnv = await TempBunFile.create({
			filePath: '.env',
			contents: 'SOME_VAR=some_var',
		})
		await using __tempEnvEx = await TempBunFile.create({
			filePath: '.env.example',
			contents: 'EXAMPLE_VAR=example',
		})
		const binaryOutput = await Bun.$`./dist/bin/bin`
		if (binaryOutput.exitCode !== 0) {
			throw new Error(binaryOutput.stderr.toString())
		}
	})
	afterEach(async () => {
		await Bun.$`rm -rf ${DTS_FILE}`
	})
	test('should build the (not temp) env.d.ts file', async () => {
		const dtsText = await Bun.file(DTS_FILE).text().catch(console.error)
		console.log(dtsText === void 0 ? 'no dts file' : dtsText)
		expect(dtsText).toBeString()
	})
	test('should ignore .env.example', async () => {
		const contents = await Bun.file('env.d.ts').text()
		expect(contents).not.toContain('EXAMPLE_VAR: string')
	})
})

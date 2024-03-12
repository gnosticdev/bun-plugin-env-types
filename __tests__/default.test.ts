import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import envPlugin from '../src/bun.plugin'
import { ShellFile, TempBunDir, TempBunFile } from './utils'

describe('default plugin options', async () => {
	const DTS_FILE = 'env.d.ts'
	const TEMP_DIR = 'tmp'
	let tempEntry: ShellFile
	let success = true
	beforeEach(async () => {
		await using __tempEnv = await TempBunFile.create({
			path: '.env',
			contents: 'SOME_VAR=some_var',
		})
		await using __tempEnvEx = await TempBunFile.create({
			path: '.env.example',
			contents: 'EXAMPLE_VAR=example',
		})

		await using tempDir = await TempBunDir.create(TEMP_DIR)
		tempEntry = await tempDir.addShellFile({
			name: 'entry.ts',
			contents: 'const hiThere = "hi there!"\nconsole.log(hiThere)\n',
		})
		console.log({ tempEntry: tempEntry })
		const builder = await Bun.build({
			entrypoints: [tempEntry.filePath],
			plugins: [envPlugin({ verbose: true, dtsFile: DTS_FILE })], // will produce env.d.ts
			outdir: tempDir.path,
		})
		success = builder.success
		!success
			? console.error(builder.logs)
			: console.log(`built ${builder.outputs.length} parts`)
	})

	afterEach(async () => {
		await Bun.$`rm -rf ${DTS_FILE}`
	})

	test.if(success)('should build the temp entry file', async () => {
		expect(tempEntry.exists).toBeTrue()
		expect(tempEntry.text).toContain('hi there!')
	})
	test.if(success)('should build the (not temp) env.d.ts file', async () => {
		const dtsText = await Bun.file(DTS_FILE).text().catch(console.error)
		console.log(dtsText === void 0 ? 'no dts file' : dtsText)
		expect(dtsText).toBeString()
	})
	test.if(success)('should ignore .env.example', async () => {
		const contents = await Bun.file('env.d.ts').text()
		expect(contents).not.toContain('EXAMPLE_VAR: string')
	})
})

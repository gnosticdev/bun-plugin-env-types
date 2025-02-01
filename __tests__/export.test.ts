import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import envPlugin from '../src/plugin'
import { TempBunDir, TempBunFile } from './utils'

describe('handle export keyword in env vars', async () => {
	const DTS_FILE = 'env.d.ts'
	let success = true

	beforeEach(async () => {
		// Create a test .env file with both normal and exported variables
		await using envFile = await TempBunFile.create({
			filePath: '.env',
			contents: [
				'NORMAL_VAR=value1',
				'export EXPORTED_VAR=value2',
				'export  EXPORTED_WITH_SPACES  =value3', // extra spaces to test trimming
				'  export EXPORTED_WITH_INDENT=value4', // indented export
			].join('\n'),
		})

		await using tempDir = await TempBunDir.create('tmp')
		const entry = await tempDir.addShellFile({
			name: 'entry.ts',
			contents: 'const hiThere = "hi there"\nconsole.log(hiThere)\n',
		})

		const builder = await Bun.build({
			entrypoints: [entry.filePath],
			plugins: [envPlugin({ verbose: true, outFile: DTS_FILE })],
			outdir: tempDir.path,
		})
		success = builder.success
		!success && console.error(builder.logs)
	})

	afterEach(async () => {
		await Bun.$`rm ${DTS_FILE}`
	})

	test('should handle both normal and exported variables', async () => {
		const contents = await Bun.file(DTS_FILE).text()
		expect(contents).toInclude('NORMAL_VAR: string')
		expect(contents).toInclude('EXPORTED_VAR: string')
		expect(contents).toInclude('EXPORTED_WITH_SPACES: string')
		expect(contents).toInclude('EXPORTED_WITH_INDENT: string')
		// Make sure the export keyword is not included in the type definitions
		expect(contents).not.toInclude('export EXPORTED_VAR')
		expect(contents).not.toInclude('export  EXPORTED_WITH_SPACES')
		expect(contents).not.toInclude('export EXPORTED_WITH_INDENT')
	})
})

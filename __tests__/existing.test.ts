import {} from 'async_hooks'
import { BunFile } from 'bun'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import envPlugin from '../src/bun.plugin'
import { ShellFile, TempBunDir, TempBunFile } from './utils'

const EXISTING_STR = `
declare namespace NodeJS {
    export interface ProcessEnv {
        LOCAL_VAR: 'a' | 'b'
        }
    }
`.trim()

describe('uses existing env.d.ts types', async () => {
	const DTS_FILE = 'env.d.ts'
	let existingEnvBunFile: BunFile
	let success = true
	let entry: ShellFile
	beforeEach(async () => {
		//create an existing env.d.ts file
		// DONT USE `using` bc it needs to be persisted
		const __existingEnv = await TempBunFile.create({
			path: DTS_FILE,
			contents: EXISTING_STR,
		})
		// only a single .env file
		await using tempEnv = await TempBunFile.create({
			path: '.env',
			contents: 'SOME_VAR=abc\nLOCAL_VAR=efg',
		})

		existingEnvBunFile = __existingEnv.file

		await using tempDir = await TempBunDir.create('tmp')
		tempDir.setVerbose(true)
		entry = await tempDir.addShellFile({
			name: 'entry.ts',
			contents: 'const hiThere = "hi there"\nconsole.log(hiThere)\n',
		})

		console.log({ entry })
		const out = await Bun.build({
			entrypoints: [entry.filePath!],
			plugins: [envPlugin({ verbose: true, dtsFile: DTS_FILE })],
			outdir: tempDir.path,
		})
		success = out.success
		success
			? console.log(`build ${out.outputs.length} files`)
			: console.error(out.logs)
	})

	afterEach(async () => {
		await Bun.$`rm ${DTS_FILE}`
	})

	test.skipIf(!success)('should use existing env.d.ts file', async () => {
		expect(await existingEnvBunFile.text()).toBeString()
		expect(await existingEnvBunFile.text()).toInclude("LOCAL_VAR: 'a' | 'b'")
	})
	test.skipIf(!success)(
		'should not overwrite existing env.d.ts file',
		async () => {
			const contents = await existingEnvBunFile.text()
			expect(contents).toInclude('SOME_VAR: string')
		},
	)
})

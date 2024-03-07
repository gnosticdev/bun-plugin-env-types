import { beforeEach, describe, expect, test } from 'bun:test'
import envPlugin from '../bun.plugin'
import { TempBunFile } from './utils'

describe.only('uses existing env.d.ts types', async () => {
	await using tempEntryPoint = await TempBunFile.create({
		path: '__tests__/tmp/entry.ts',
		contents: 'console.log(process.env.SOME_VAR)',
	})
	const DTS_FILE = 'env.d.ts'
	await using exisingEnv = await TempBunFile.create({
		path: DTS_FILE,
		contents: '',
	})
	beforeEach(async () => {
		await using tempEnv = await TempBunFile.create({
			path: '.env',
			contents: 'SOME_VAR=123\nLOCAL_VAR=local',
		})
		console.log({ tempEnv, tempEntryPoint })
		const out = await Bun.build({
			entrypoints: [tempEntryPoint.path],
			plugins: [envPlugin({ verbose: true, dtsFile: DTS_FILE })],
		})
	})

	test('should use existing env.d.ts file', async () => {
		expect(await Bun.file(exisingEnv.path).exists()).toBe(true)
	})
	test('should not overwrite existing env.d.ts file', async () => {
		const contents = await exisingEnv.file.text()
		expect(contents).toInclude('SOME_VAR: string')
	})
})

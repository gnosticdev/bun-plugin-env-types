import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import envPlugin from '../bun.plugin'
import { ShellFile, TempBunDir, TempBunFile } from './utils'

describe('temp dir', async () => {
	const TEMP_DIR = 'tmp'
	const DTS_FILE = 'env.d.ts'
	let tempDir: TempBunDir
	let tempFile: ShellFile
	let envdts: string
	beforeEach(async () => {
		await using _tempDir = await TempBunDir.create(TEMP_DIR)
		_tempDir.setVerbose(true)
		tempDir = _tempDir

		tempFile = await tempDir.addShellFile({
			name: 'entry.ts',
			contents: 'const hiThere = "hi there"\nconsole.log(hiThere)\n',
		})

		await using __env = await TempBunFile.create({
			path: '.env',
			contents: 'SOME_VAR=abc\nLOCAL_VAR=local',
		})
		const builder = await Bun.build({
			entrypoints: [tempFile.filePath!],
			plugins: [envPlugin({ verbose: true, dtsFile: DTS_FILE })],
			outdir: tempDir.path,
		})

		console.log({ builder })

		envdts = await Bun.$`cat ${DTS_FILE}`.text()
	})

	afterEach(async () => {
		await Bun.$`rm ${DTS_FILE}`
	})

	test('should create a temp dir', async () => {
		expect(tempDir).toBeInstanceOf(TempBunDir)
		expect(tempDir).toHaveProperty('path')
	})
	test('should add a file to the temp dir', async () => {
		expect(tempDir.shellFile).toBeObject()
		expect(tempDir.shellFile).toContainKeys(['filePath', 'text', 'exists'])
		expect(tempDir.shellFile.exists).toBeTrue()
		expect(tempDir.shellFile.filePath).toBe(`${TEMP_DIR}/entry.ts`)
	})
	test('bunfile should be available', async () => {
		expect(tempFile).toContainKeys(['filePath', 'text', 'exists'])
		expect(tempFile).toBeObject()
		expect(tempFile.exists).toBeTrue()
		expect(tempFile.filePath).toBe(`${TEMP_DIR}/entry.ts`)
	})
	test('should create a env.d.ts file', async () => {
		console.log({ envdts })
		expect(envdts).toBeString()
		expect(envdts).not.toBeEmpty()
	})
})

describe('use the shellFile', async () => {
	let addedFile: ShellFile
	let tempDir: TempBunDir
	beforeEach(async () => {
		await using _tempDir = await TempBunDir.create('tmp')
		tempDir = _tempDir
		tempDir.setVerbose(true)
		addedFile = await tempDir.addShellFile({
			name: 'entry.ts',
			contents: 'const hiThere = "hi there"\nconsole.log(hiThere)\n',
		})
	})
	test('should add file', async () => {
		console.log({ addedFile })
		expect(addedFile).toBeObject()
		expect(addedFile).toContainKeys(['filePath', 'text', 'exists'])
		expect(addedFile.filePath).toBe('tmp/entry.ts')
		expect(addedFile.text).toBe(
			'const hiThere = "hi there"\nconsole.log(hiThere)\n',
		)
		expect(addedFile.exists).toBeTrue()
	})
	test('should get deleted', async () => {})
})

import { beforeEach, describe, expect, test } from 'bun:test'
import { TempBunDir } from './utils'

describe('temp dir', async () => {
	const TEMP_DIR = 'tmp'
	let tempDir: TempBunDir
	beforeEach(async () => {
		await using _tempDir = await TempBunDir.create(TEMP_DIR)
		const bunfile = await _tempDir.addFile({
			file: 'entry.ts',
			contents: 'const hiThere = "hi there"\nconsole.log(hiThere)\n',
		})
		tempDir = _tempDir
	})

	test('should create a temp dir', async () => {
		expect(tempDir).toBeInstanceOf(TempBunDir)
		expect(tempDir).toHaveProperty('path')
	})
	test('should add a file to the temp dir', async () => {
		expect(tempDir.file).toBeInstanceOf(Blob)
		expect(tempDir.file).toHaveProperty('name')
		expect(tempDir.file.name).toBeDefined()
		expect(tempDir.file.name).toBe('entry.ts')
	})
})

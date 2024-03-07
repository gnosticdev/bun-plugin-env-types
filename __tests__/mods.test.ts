import { beforeEach, describe, expect, test } from 'bun:test'
import envPlugin from '../bun.plugin'
import { TempBunDir, TempBunFile } from './utils'

describe('keep the .env.d.ts file modifications', async () => {
	const mods = `// This will remain on every rebuild, so you can add your own custom types here.
    declare module '*.css' {
        const content: { [className: string]: string }
        export default content
    }`
	const TEMP_DIR = 'tmp'
	const ENV_DTS_PATH = 'env.d.ts'
	let contentsWithMods: string
	let envValidPath: string

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

		await using tempEntryPoint = await TempBunDir.create(TEMP_DIR)
		const entry = await tempEntryPoint.addFile({
			file: 'entry.ts',
			contents: 'const hiThere = "hi there"\nconsole.log(hiThere)\n',
		})
		await Bun.build({
			entrypoints: [entry.name!],
			plugins: [envPlugin()],
			outdir: tempEntryPoint.path,
		})
		const dtsContent = await Bun.file(ENV_DTS_PATH).text()
		contentsWithMods = (dtsContent + mods).trim()
	})

	test('gets the env variables', async () => {
		expect(contentsWithMods).toInclude('TEST_VAR: string')
		expect(contentsWithMods).toInclude('LOCAL_VAR: string')
	})
	test('should keep the modifications', async () => {
		expect(contentsWithMods).toInclude(mods)
	})
	test('modifications only listed once', async () => {
		expect(contentsWithMods.split(mods)).toBeArrayOfSize(2)
	})
})

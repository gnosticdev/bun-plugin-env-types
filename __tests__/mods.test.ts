import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import envPlugin from '../src/bun.plugin'
import { TempBunDir, TempBunFile } from './utils'

describe('keep the .env.d.ts file modifications', async () => {
	const mods = `// This will remain on every rebuild, so you can add your own custom types here.
    declare module '*.css' {
        const content: { [className: string]: string }
        export default content
    }`
	const TEMP_DIR = 'tmp'
	const DTS_PATH = 'env.d.ts'
	let contentsWithMods: string
	let envValidPath: string
	let success = true
	beforeEach(async () => {
		await using envTestExample = await TempBunFile.create({
			path: '.env.test.example',
			contents: 'EXAMPLE_VAR=example',
		})
		await using envTestValid = await TempBunFile.create({
			path: '.env.test',
			contents: 'VALID_VAR=valid',
		})
		envValidPath = envTestValid.path

		await using tempEntryPoint = await TempBunDir.create(TEMP_DIR)
		const entry = await tempEntryPoint.addShellFile({
			name: 'entry.ts',
			contents: 'const hiThere = "hi there"\nconsole.log(hiThere)\n',
		})
		const builder = await Bun.build({
			entrypoints: [entry.filePath],
			plugins: [envPlugin()],
			outdir: tempEntryPoint.path,
		})
		if (!builder.success) {
			success = false
			console.error(builder.logs.join('\n'))
		} else {
			console.log(`build ${builder.outputs.length} file(s)`)
		}

		const dtsContent = await Bun.file(DTS_PATH).text()
		contentsWithMods = (dtsContent + mods).trim()
	})

	afterEach(async () => {
		await Bun.$`rm ${DTS_PATH}`
	})

	test('gets the env variables', async () => {
		expect(contentsWithMods).toInclude('EXAMPLE_VAR: string')
		expect(contentsWithMods).toInclude('VALID_VAR: string')
	})
	test('should keep the modifications', async () => {
		expect(contentsWithMods).toInclude(mods)
	})
	test('modifications only listed once', async () => {
		expect(contentsWithMods.split(mods)).toBeArrayOfSize(2)
	})
})

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import envPlugin, { PluginOptions } from './bun.plugin'

let tmpFile: string
function createEnvMap<const T extends Record<string, string[]>>(envMap: T) {
	return Object.entries(envMap) as [keyof T, string[]][]
}

// create a temp file for us to build
beforeAll(async () => {
	const contents = 'const hiThere = "hi there!"\nconsole.log(hiThere)\n'
	tmpFile = path.join(process.cwd(), 'tmp/fake.ts')
	await Bun.write(tmpFile, contents)
})

afterAll(() => {
	fs.rmSync(path.join(process.cwd(), 'tmp'), { recursive: true })
})

describe('default plugin options', () => {
	let envdtsPath: string
	const envMap = {
		'.env': ['SOME_VAR=123', 'LOCAL_VAR=local'],
		'.env.example': ['EXAMPLE_VAR=example'],
		'.env.test': ['TEST_VAR=test'],
	}
	const envMapEntries = createEnvMap(envMap)

	beforeAll(async () => {
		// create .env, .env.example, .env.test
		for await (const [file, content] of envMapEntries) {
			await Bun.write(path.join(process.cwd(), file), content.join('\n'))
		}
		await Bun.build({
			entrypoints: [tmpFile],
			plugins: [envPlugin()],
			outdir: 'tmp',
		})
		envdtsPath = path.resolve(process.cwd(), 'env.d.ts')
	})
	afterAll(() => {
		fs.rmSync(envdtsPath)
		for (const file of Object.keys(envMap)) {
			fs.rmSync(path.join(process.cwd(), file))
		}
		console.log('removed envdts and all .env files')
	})

	test('should build the fake file', async () => {
		expect(fs.existsSync(tmpFile)).toBe(true)
	})
	test('should build the env.d.ts file', async () => {
		expect(fs.existsSync(envdtsPath)).toBe(true)
	})
	test('should ignore .env.example', async () => {
		const combined = await Bun.file(envdtsPath).text()
		expect(combined).not.toContain('EXAMPLE_VAR: string')
	})
})

type FullOptions = Required<Omit<PluginOptions, 'envFiles'>> &
	Pick<PluginOptions, 'envFiles'>

describe('custom options', () => {
	let customOptions: FullOptions
	let envdtsPath: string
	const envMapKeys: string[] = []
	beforeAll(async () => {
		const envMap = {
			'.env': ['SOME_VAR=123', 'LOCAL_VAR=local'],
			'.env.example': ['EXAMPLE_VAR=example'],
			'.env.test': ['TEST_VAR=test'],
			'.env.test.ignore': ['IGNORED_VAR=ignored'],
		}
		const envMapEntries = createEnvMap(envMap)

		for await (const [file, content] of envMapEntries) {
			await Bun.write(path.join(process.cwd(), file), content.join('\n'))
			envMapKeys.push(file)
		}

		customOptions = {
			dtsFile: 'env.alt.d.ts',
			glob: '.env.test*',
			ignore: ['.env.test.ignore', '.env.example'],
			timestamp: false,
		}
		await Bun.build({
			entrypoints: [tmpFile],
			plugins: [envPlugin(customOptions)],
			outdir: 'tmp',
		})
		envdtsPath = path.join(process.cwd(), customOptions.dtsFile)
		console.log('envdtsPath', envdtsPath)
	})
	afterAll(() => {
		fs.rmSync(envdtsPath)
		for (const [file, _] of envMapKeys) {
			fs.rmSync(path.join(process.cwd(), file))
		}
	})
	describe('uses custom options', () => {
		test('should build the env.alt.d.ts file', async () => {
			expect(fs.existsSync(envdtsPath)).toBe(true)
		})
		test('should have all env files', () => {
			const dirFiles = fs.readdirSync(process.cwd())
			expect(dirFiles).toBeArray()
			expect(dirFiles).toContainKeys(envMapKeys)
		})
		test('ignore options.ignore values', async () => {
			const contents = await Bun.file(envdtsPath).text()
			expect(contents).not.toInclude('IGNORED_VAR: string')
			expect(contents).not.toInclude('EXAMPLE_VAR: string')
		})
		test('should not have a timestamp', async () => {
			const contents = await Bun.file(envdtsPath).text()
			expect(contents).not.toInclude('// Generated by Bun plugin at')
		})
	})
})

describe('keep the .env.d.ts file modifications', () => {
	let mods = ''
	let combined: string
	let envdtsPath: string
	const envMapKeys: string[] = []

	beforeAll(async () => {
		mods = `// This will remain on every rebuild, so you can add your own custom types here.
declare module '*.css' {
    const content: { [className: string]: string }
    export default content
}`
		const envMap = {
			'.env': ['SOME_VAR=some_var', 'LOCAL_VAR=local_var'],
			'.env.test': ['TEST_VAR=test'],
		}
		const envMapEntries = createEnvMap(envMap)
		for await (const [file, contents] of envMapEntries) {
			await Bun.write(file, contents)
			envMapKeys.push(file)
		}
		const combinedContents = (await Bun.file(envdtsPath).text()) + mods
		await Bun.write(envdtsPath, combinedContents)
		combined = await Bun.file(envdtsPath).text()
	})

	afterAll(() => {
		fs.rmSync(envdtsPath)
		for (const [file, _] of envMapKeys) {
			fs.rmSync(path.join(process.cwd(), file))
		}
	})

	test('gets the env variables', async () => {
		expect(combined).toContain('TEST_VAR: string')
		expect(combined).toContain('LOCAL_VAR: string')
	})
	test('should keep the modifications', async () => {
		expect(combined).toContain(mods)
		expect(combined.split(mods)).toBeArrayOfSize(1)
	})
	test('modifications only listed once', async () => {
		expect(combined).toContain(mods)
		expect(combined.split(mods)).toBeArrayOfSize(1)
	})
})

import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import envPlugin from './bun.plugin'

const fakeFile = path.join(process.cwd(), 'tmp/fake.ts')

beforeAll(async () => {
	const contents = 'const hiThere = "hi there!"\nconsole.log(hiThere)\n'
	await Bun.write(fakeFile, contents, { createPath: true })

	await Bun.build({
		entrypoints: [fakeFile],
		plugins: [envPlugin()],
	})
})

afterAll(() => {
	fs.rmSync(path.join(process.cwd(), 'tmp'), { recursive: true })
	fs.rmSync(path.join(process.cwd(), 'env.d.ts'))
})

describe('build the env.d.ts file', () => {
	test('should build the fake file', async () => {
		expect(fs.existsSync(fakeFile)).toBe(true)
	})
	test('should build the env.d.ts file', async () => {
		expect(fs.existsSync(path.join(process.cwd(), 'env.d.ts'))).toBe(true)
	})
})

describe('build the env.d.ts file while keeping the modifications', () => {
	let mods = ''
	let envdts: string
	let combined: string
	beforeAll(async () => {
		mods = `// This will remain on every rebuild, so you can add your own custom types here.
declare module '*.css' {
    const content: { [className: string]: string }
    export default content
}`
		const envdts = path.resolve(process.cwd(), 'env.d.ts')
		const combined = (await Bun.file(envdts).text()) + mods
		await Bun.write(envdts, combined)
	})
	beforeEach(async () => {
		envdts = path.resolve(process.cwd(), 'env.d.ts')
		combined = await Bun.file(envdts).text()
	})
	test('gets the env variables', async () => {
		expect(combined).toContain('SOME_SECRET: string;')
	})
	test('should keep the modifications', async () => {
		expect(combined).toContain(mods)
	})
})

import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	spyOn,
	test,
} from 'bun:test'
import * as readline from 'node:readline'
import { TempBunFile } from './utils'

// File paths for testing
const ENV_PROD = '.env.production'
const ENV_DEV = '.env.development'
const ENV_DEFAULT = '.env'
const CUSTOM_OUTFILE = 'custom-types.d.ts'
const DEFAULT_DTS_FILE = 'env.d.ts'

describe('CLI flags', async () => {
	let readlineInterfaceMock: {
		question: (prompt: string, callback: (answer: string) => void) => void
	}

	beforeAll(async () => {
		await Bun.$`bun build ./src/bin.ts --compile --outfile ./dist/bin`
	})

	beforeEach(async () => {
		// Mock readline interface to auto-answer 'y' to prompts
		readlineInterfaceMock = {
			question: (prompt, callback) => {
				// Automatically answer 'y' to any prompt
				callback('y')
			},
		}

		// Spy on readline.createInterface to return our mock
		spyOn(readline, 'createInterface').mockImplementation(
			() => readlineInterfaceMock as readline.Interface,
		)
	})

	afterEach(async () => {
		// Clean up generated files
		await Bun.$`rm -f ${DEFAULT_DTS_FILE} ${CUSTOM_OUTFILE}`.quiet().nothrow()
	})

	describe('default behavior', () => {
		let exitCode: number

		beforeEach(async () => {
			// Create temporary environment files
			await using __tempEnvDefault = await TempBunFile.create({
				filePath: ENV_DEFAULT,
				contents: 'DEFAULT_VAR=default_value',
			})

			await using __tempEnvProd = await TempBunFile.create({
				filePath: ENV_PROD,
				contents: 'PROD_VAR=production_value\nAPI_KEY=production_key',
			})

			await using __tempEnvDev = await TempBunFile.create({
				filePath: ENV_DEV,
				contents: 'DEV_VAR=development_value\nDEBUG=true',
			})

			// Set up the command but don't run it yet
			exitCode = (await Bun.$`./dist/bin`).exitCode
		})

		test('should generate env.d.ts with all variables by default', async () => {
			// Run the CLI without flags
			expect(exitCode).toBe(0)

			// Check the output file
			const content = await Bun.file(DEFAULT_DTS_FILE)
				.text()
				.catch(console.error)
			expect(content).toContain('DEFAULT_VAR: string')
			expect(content).toContain('PROD_VAR: string')
			expect(content).toContain('DEV_VAR: string')
		})
	})

	describe('with --env flag', () => {
		let exitCode: number

		beforeEach(async () => {
			// Create temporary environment files
			await using __tempEnvDefault = await TempBunFile.create({
				filePath: ENV_DEFAULT,
				contents: 'DEFAULT_VAR=default_value',
			})

			await using __tempEnvProd = await TempBunFile.create({
				filePath: ENV_PROD,
				contents: 'PROD_VAR=production_value\nAPI_KEY=production_key',
			})

			await using __tempEnvDev = await TempBunFile.create({
				filePath: ENV_DEV,
				contents: 'DEV_VAR=development_value\nDEBUG=true',
			})

			// Set up the command with --env flag
			exitCode = (await Bun.$`./dist/bin --env production`).exitCode
		})

		test('should only include env vars from specified environment with --env flag', async () => {
			expect(exitCode).toBe(0)

			// Check the output file only contains production variables
			const content = await Bun.file('env.d.ts').text()
			expect(content).toContain('PROD_VAR: string')
			expect(content).toContain('API_KEY: string')
			expect(content).not.toContain('DEFAULT_VAR: string')
			expect(content).not.toContain('DEV_VAR: string')
		})
	})

	describe('with --outfile flag', () => {
		let exitCode: number

		beforeEach(async () => {
			// Create temporary environment files
			await using __tempEnvDefault = await TempBunFile.create({
				filePath: ENV_DEFAULT,
				contents: 'DEFAULT_VAR=default_value',
			})

			await using __tempEnvProd = await TempBunFile.create({
				filePath: ENV_PROD,
				contents: 'PROD_VAR=production_value\nAPI_KEY=production_key',
			})

			await using __tempEnvDev = await TempBunFile.create({
				filePath: ENV_DEV,
				contents: 'DEV_VAR=development_value\nDEBUG=true',
			})

			// Set up the command with --outfile flag
			exitCode = (await Bun.$`./dist/bin --outfile ${CUSTOM_OUTFILE}`).exitCode
		})

		test('should use a custom output filename with --outfile flag', async () => {
			expect(exitCode).toBe(0)

			// Check the custom output file was created
			const exists = await Bun.file(CUSTOM_OUTFILE).exists()
			expect(exists).toBeTrue()

			// Default output file should not exist
			const defaultFileExists = await Bun.file('env.d.ts').exists()
			expect(defaultFileExists).toBeFalse()

			// Check content of the custom file
			const content = await Bun.file(CUSTOM_OUTFILE).text()
			expect(content).toContain('DEFAULT_VAR: string')
			expect(content).toContain('PROD_VAR: string')
			expect(content).toContain('DEV_VAR: string')
		})
	})

	describe('with combined --env and --outfile flags', () => {
		let exitCode: number

		beforeEach(async () => {
			// Create temporary environment files
			await using __tempEnvDefault = await TempBunFile.create({
				filePath: ENV_DEFAULT,
				contents: 'DEFAULT_VAR=default_value',
			})

			await using __tempEnvProd = await TempBunFile.create({
				filePath: ENV_PROD,
				contents: 'PROD_VAR=production_value\nAPI_KEY=production_key',
			})

			await using __tempEnvDev = await TempBunFile.create({
				filePath: ENV_DEV,
				contents: 'DEV_VAR=development_value\nDEBUG=true',
			})

			// Set up the command with both --env and --outfile flags
			exitCode = (
				await Bun.$`./dist/bin --env development --outfile ${CUSTOM_OUTFILE}`
			).exitCode
		})

		test('should combine --env and --outfile flags', async () => {
			expect(exitCode).toBe(0)

			// Check the custom output file was created
			const exists = await Bun.file(CUSTOM_OUTFILE).exists()
			expect(exists).toBeTrue()

			// Check content of the custom file (should only contain development variables)
			const content = await Bun.file(CUSTOM_OUTFILE).text()
			expect(content).toContain('DEV_VAR: string')
			expect(content).toContain('DEBUG: string')
			expect(content).not.toContain('DEFAULT_VAR: string')
			expect(content).not.toContain('PROD_VAR: string')
		})
	})

	describe('with --overwrite flag', () => {
		let exitCode: number

		beforeEach(async () => {
			// Create temporary environment files
			await using __tempEnvDefault = await TempBunFile.create({
				filePath: ENV_DEFAULT,
				contents: 'DEFAULT_VAR=default_value',
			})

			await using __tempEnvProd = await TempBunFile.create({
				filePath: ENV_PROD,
				contents: 'PROD_VAR=production_value\nAPI_KEY=production_key',
			})

			await using __tempEnvDev = await TempBunFile.create({
				filePath: ENV_DEV,
				contents: 'DEV_VAR=development_value\nDEBUG=true',
			})

			// Modify the content to add a known string
			await Bun.write(DEFAULT_DTS_FILE, '// MARKER')

			// Set up command with --overwrite flag
			exitCode = (await Bun.$`./dist/bin --overwrite`).exitCode
		})

		test('should use --overwrite flag to skip confirmation prompt', async () => {
			expect(exitCode).toBe(0)

			// Check the file was overwritten (marker should be gone)
			const newContent = await Bun.file(DEFAULT_DTS_FILE).text()
			expect(newContent).not.toContain('// MARKER')
		})
	})
})

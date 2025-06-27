import { beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import type { ShellOutput } from 'bun'

/**
 * Helper to ensure output is a string for assertions.
 */
function bufferToString(val: string | Buffer): string {
	return typeof val === 'string' ? val : val.toString('utf8')
}

/**
 * Test that the CLI prints the help menu and exits with code 0 when --help is passed.
 */
describe('CLI help and validation', () => {
	beforeAll(async () => {
		await Bun.$`bun build ./src/bin.ts --compile --outfile ./dist/bin`
	})

	describe('--help flag', () => {
		let result: ShellOutput

		beforeEach(async () => {
			result = await Bun.$`./dist/bin --help`
		})

		test('should print help menu and exit with code 0', async () => {
			// Check exit code
			expect(result.exitCode).toBe(0)
			// Check that help menu is printed (look for key phrases)
			expect(result.text()).toContain('Usage:')
			expect(result.text()).toContain('--help')
			expect(result.text()).toContain('--import-meta-env')
			// Should not print errors
			expect(result.stderr).toBeEmpty()
		})
	})

	describe('-h flag (short form)', () => {
		let result: ShellOutput

		beforeEach(async () => {
			result = await Bun.$`./dist/bin -h`
		})

		test('should print help menu and exit with code 0 with -h flag', async () => {
			// Check exit code
			expect(result.exitCode).toBe(0)
			// Check that help menu is printed (look for key phrases)
			expect(result.text()).toContain('Usage:')
			expect(result.text()).toContain('--help')
			expect(result.text()).toContain('--import-meta-env')
			// Should not print errors
			expect(result.stderr).toBeEmpty()
		})
	})

	describe('mandatory .d.ts file path validation', () => {
		test('should show help when single non-.d.ts argument is passed', async () => {
			const result = await Bun.$`./dist/bin invalid-file.txt`

			// Should exit with code 0 (help menu)
			expect(result.exitCode).toBe(0)
			// Should show help menu
			expect(result.text()).toContain('Usage:')
			expect(result.text()).toContain('--help')
		})

		test('should show help when single argument without .d.ts extension is passed', async () => {
			const result = await Bun.$`./dist/bin myfile`

			// Should exit with code 0 (help menu)
			expect(result.exitCode).toBe(0)
			// Should show help menu
			expect(result.text()).toContain('Usage:')
			expect(result.text()).toContain('--help')
		})

		test('should show help when single flag-like argument is passed', async () => {
			const result = await Bun.$`./dist/bin --invalid-flag`

			// Should exit with code 0 (help menu)
			expect(result.exitCode).toBe(0)
			// Should show help menu
			expect(result.text()).toContain('Usage:')
			expect(result.text()).toContain('--help')
		})

		test('should accept valid .d.ts file as path argument', async () => {
			// Create temporary environment file
			await Bun.write('.env', 'TEST_VAR=test_value')

			try {
				const result = await Bun.$`./dist/bin custom-types.d.ts`

				// Should not show help menu (should process normally)
				expect(result.exitCode).toBe(0)
				// Should not contain help text
				expect(result.text()).not.toContain('Usage:')
				// Should contain success message
				expect(result.text()).toContain('types generated successfully!')

				// Verify the custom file was created
				const customFileExists = await Bun.file('custom-types.d.ts').exists()
				expect(customFileExists).toBeTrue()
			} finally {
				// Clean up
				await Bun.$`rm -f .env custom-types.d.ts`.quiet().nothrow()
			}
		})
	})
})

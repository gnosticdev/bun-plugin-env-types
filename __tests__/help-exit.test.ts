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
describe('CLI --help flag', () => {
	let result: ShellOutput

	beforeAll(async () => {
		await Bun.$`bun build ./src/bin.ts --compile --outfile ./dist/bin`
	})
	beforeEach(async () => {
		result = await Bun.$`./dist/bin --help`
	})
	test('should print help menu and exit with code 0', async () => {
		// Check exit code
		expect(result.exitCode).toBe(0)
		// Check that help menu is printed (look for a key phrase)
		expect(result.text()).toContain('Usage:')
		expect(result.text()).toContain('--help')
		// Should not print errors
		expect(result.stderr).toBeEmpty()
	})
})

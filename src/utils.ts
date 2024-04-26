import type { BunFile, Glob } from 'bun'

/**
 * Write the type definitions to the env.d.ts file
 * @param typeDefs - Map of environment variable names and their types
 * @param envDtsFile - The file to write the type definitions to
 * @param timestamp - Whether to include a timestamp in the file
 */
export async function writeToEnvDts({
	typeDefs,
	envDtsFile,
	timestamp,
	importMetaEnv,
}: {
	typeDefs: Map<string, string>
	envDtsFile: BunFile
	timestamp?: boolean
	importMetaEnv?: boolean
}) {
	const comment = timestamp ? new Date().toLocaleString() : ''
	const dtsContent = generateDtsString(typeDefs, comment, importMetaEnv)
	// clear the file up to the mod line
	const content = (await envDtsFile.text().catch(() => '')) ?? ''
	const modLine = content.indexOf(MOD_LINE)
	if (modLine !== -1) {
		// must concat old and new content bc Bun.write doesn't append
		const oldContent = content.slice(modLine, content.length)
		await Bun.write(envDtsFile, dtsContent + oldContent)
		return envDtsFile
	}

	// Write the env.d.ts file
	await Bun.write(envDtsFile, `${dtsContent + MOD_LINE}\n`)
	return envDtsFile
}

/**
 * Generate the env.d.ts file content as a string
 * @param typeDefs
 * @param timestamp
 */
export function generateDtsString(
	typeDefs: Map<string, string>,
	timestamp?: string,
	importMetaEnv?: boolean,
) {
	let defsContent = ''
	for (const [key, value] of typeDefs) {
		defsContent += `\t\t${key}: ${value}\n`
	}
	const timeString = timestamp
		? `// Generated by Bun plugin at ${timestamp}\n`
		: ''
	const dtsContent = importMetaEnv
		? `${timeString}interface ImportMetaEnv {
        ${defsContent}
    }`
		: `${timeString}declare namespace NodeJS {
    export interface ProcessEnv {
${defsContent}    }
}

`

	return dtsContent
}
/**
 * Get all .env files in the project
 * @param glob
 * @param ignore
 */
export async function getEnvFiles(glob: Glob, ignore: string[]) {
	const files = await Array.fromAsync(glob.scan({ dot: true, absolute: false }))
	return files.filter((file) => !ignore.some((ig) => ig.endsWith(file)))
}

/**
 * Code snippet to be added to the env.d.ts file that separates the generated content from the user's content
 */
export const MOD_LINE = `
//---------------------------------------------------------------------//
//-----------------------ADD YOUR CODE BELOW---------------------------//
//---------------------------------------------------------------------//
`

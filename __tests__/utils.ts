export type ShellFile = { filePath: string; text: string; exists: boolean }

/**
 * Logs a message in red color for better visibility
 * @param message - The message to log in red
 * @returns The formatted red message string
 */
export const redLog = (message: string) => `\x1b[38;5;199m${message}\x1b[0m`

/**
 * A temporary directory class that manages a temporary directory using Bun Shell.
 * Implements AsyncDisposable for automatic cleanup.
 */
export class TempBunDir implements AsyncDisposable {
	public path: string
	private verbose = false
	public shellFile: ShellFile = { filePath: '', text: '', exists: false }

	/**
	 * Sets the verbose logging mode
	 * @param value - Whether to enable verbose logging
	 */
	public setVerbose(value: boolean) {
		this.verbose = value
	}

	private constructor(dirPath: string) {
		this.path = dirPath
	}

	/**
	 * Adds a file to the temp directory using Bun Shell
	 *
	 * _This will be **deleted** with the directory!_
	 * @param name - The name of the file to create
	 * @param contents - The contents of the file
	 * @returns A ShellFile object representing the created file
	 */
	public async addShellFile({
		name,
		contents,
	}: { name: string; contents: string }) {
		this.shellFile = {
			filePath: `${this.path}/${name}`,
			text: contents,
			exists: true,
		}
		await Bun.$`echo ${contents} > ${this.shellFile.filePath}`
		this.verbose &&
			console.log(
				`\x1b[38;5;112mAdded shell file: ${this.shellFile.filePath}\x1b[0m`,
			)
		return this.shellFile
	}

	/**
	 * Disposes of the temporary directory by removing it and all its contents
	 */
	public async [Symbol.asyncDispose]() {
		await Bun.$`rm -rf ${this.path}`
		this.verbose &&
			console.log(`\x1b[38;5;199mDeleted temp dir: ${this.path}\x1b[0m`)
	}

	/**
	 * Creates a new temporary directory
	 * @param dirPath - The path where the temporary directory should be created
	 * @returns A new TempBunDir instance
	 */
	public static async create(dirPath: string) {
		await Bun.$`mkdir -p ${dirPath}`.quiet()
		return new TempBunDir(dirPath)
	}
}

/**
 * A temporary file class that manages a temporary file using Bun Shell.
 * Implements AsyncDisposable for automatic cleanup.
 */
export class TempBunFile<
	TPath extends string,
	TJson,
	TType extends 'json' | 'text',
> implements AsyncDisposable
{
	public filePath: TPath
	public type: TType
	private verbose = false

	/**
	 * Sets the verbose logging mode
	 * @param value - Whether to enable verbose logging
	 */
	public setVerbose(value: boolean) {
		this.verbose = value
	}

	private constructor(
		filePath: TPath,
		private text: string,
		private json: TJson,
		type: TType,
	) {
		this.filePath = filePath
		this.text = text
		this.json = json
		this.type = type
	}

	/**
	 * Reads the file contents as JSON
	 * @returns The parsed JSON content
	 */
	public async getJson() {
		return (await Bun.$`cat ${this.filePath}`.json()) as TJson
	}

	/**
	 * Reads the file contents as text
	 * @returns The file content as a string
	 */
	public async getText() {
		return await Bun.$`cat ${this.filePath}`.text()
	}

	/**
	 * Appends text to the end of the file
	 * @param text - The text to append
	 */
	public async append(text: string) {
		await Bun.$`echo ${text} >> ${this.filePath}`
	}

	/**
	 * Disposes of the temporary file by removing it
	 */
	public async [Symbol.asyncDispose]() {
		const exitCode = (await Bun.$`rm ${this.filePath}`.nothrow()).exitCode
		if (exitCode !== 0) {
			console.error(redLog(`Failed to delete temp file: ${this.filePath}`))
			return
		}
		this.verbose && console.log(redLog(`Deleted temp file: ${this.filePath}`))
	}

	/**
	 * Creates a temporary file in the current directory.
	 * @throws if file already exists
	 */
	public static async create<
		TFilePath extends `${string}.${string}`,
		TFileType extends 'json' | 'text' = TFilePath extends `${string}.json`
			? 'json'
			: 'text',
	>({
		filePath,
		contents,
	}: TFilePath extends `${string}.json`
		? { filePath: TFilePath; contents: object }
		: { filePath: TFilePath; contents: string }) {
		// throw if file exists
		const exitCode = (await Bun.$`ls ${filePath}`.quiet().nothrow()).exitCode
		if (exitCode === 0) {
			throw new Error(`File already exists: ${filePath}`)
		}
		const text: string =
			typeof contents === 'string' ? contents : JSON.stringify(contents)
		const _json = typeof contents === 'object' ? contents : undefined
		const type = (filePath.endsWith('.json') ? 'json' : 'text') as TFileType
		await Bun.$`echo ${text} > ${filePath}`.quiet()
		return new TempBunFile<TFilePath, typeof _json, TFileType>(
			filePath as TFilePath,
			text,
			_json,
			type,
		)
	}
}

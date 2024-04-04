import type { BunFile } from 'bun'

export type ShellFile = { filePath: string; text: string; exists: boolean }

export const redLog = (message: string) => `\x1b[38;5;199m${message}\x1b[0m`
export class TempBunDir implements AsyncDisposable {
	public path: string
	private verbose = false
	public shellFile: ShellFile = { filePath: '', text: '', exists: false }

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

	public async [Symbol.asyncDispose]() {
		await Bun.$`rm -rf ${this.path}`
		this.verbose &&
			console.log(`\x1b[38;5;199mDeleted temp dir: ${this.path}\x1b[0m`)
	}

	public static async create(dirPath: string) {
		await Bun.$`mkdir -p ${dirPath}`.quiet()
		return new TempBunDir(dirPath)
	}
}

type TempFile = {
	path: string
	file: BunFile
}

type TempFileCreate = {
	path: string
	contents?: string
}

export class TempBunFile<
	TPath extends string,
	TJson,
	TType extends 'json' | 'text',
> implements AsyncDisposable
{
	public filePath: TPath
	public type: TType
	private verbose = false

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

	public async getJson() {
		return (await Bun.$`cat ${this.filePath}`.json()) as TJson
	}

	public async getText() {
		return await Bun.$`cat ${this.filePath}`.text()
	}

	public async append(text: string) {
		await Bun.$`echo ${text} >> ${this.filePath}`
	}

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

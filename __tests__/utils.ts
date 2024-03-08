import { BunFile } from 'bun'

export type ShellFile = { filePath: string; text: string; exists: boolean }

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

export class TempBunFile implements AsyncDisposable {
	path: string
	file: BunFile
	private verbose = false

	public setVerbose(value: boolean) {
		this.verbose = value
	}

	private constructor({ path, file }: TempFile) {
		this.path = path
		this.file = file
	}
	// The scope will be determined by where this is called
	public static async create({ path, contents }: TempFileCreate) {
		const tmpFile = Bun.file(path)
		if (contents) {
			await Bun.write(tmpFile, contents)
		}
		return new TempBunFile({ path: path, file: tmpFile })
	}
	// Will auto delete when the scope is exited
	public async [Symbol.asyncDispose]() {
		await Bun.$`rm ${this.path}`.quiet()
		this.verbose &&
			console.log(`\x1b[38;5;201mDeleted temp file: ${this.path}\x1b[0m`)
	}
	// Now we can append to a BunFile :)
	public async append(contents: string) {
		await Bun.$`echo ${contents} >> ${this.file}`.quiet()
		return this.file
	}
}

import { BunFile } from 'bun'

export class TempBunDir implements AsyncDisposable {
	public path: string
	private _file: BunFile

	get file() {
		return this._file
	}
	set file(value: BunFile) {
		this._file = value
	}

	private constructor(dirPath: string) {
		this.path = dirPath
	}

	/**
	 * Adds a file to the temp directory
	 *
	 * **This will be deleted with the directory!**
	 */
	public async addFile({
		file,
		contents,
	}: { file: string; contents?: string }) {
		await using tempFile = await TempBunFile.create({
			path: `${this.path}/${file}`,
		})
		this.file = tempFile.file
		if (contents) {
			this.file = await tempFile.append(contents)
		}
		return this.file
	}

	public async [Symbol.asyncDispose]() {
		await Bun.$`rm -rf ${this.path}`
	}

	public static async create(dirPath: string) {
		await Bun.$`mkdir -p ${dirPath}`
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
	}
	// Now we can append to a BunFile :)
	public async append(contents: string) {
		await Bun.$`echo ${contents} >> ${this.file}`.quiet()
		return this.file
	}
}

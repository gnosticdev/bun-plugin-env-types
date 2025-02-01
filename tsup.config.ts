import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/plugin.ts'],
	outDir: 'dist',
	format: ['esm'],
	dts: true,
	clean: true,
	splitting: false,
	treeshake: true,
	sourcemap: true,
	minify: true,
})

import bunEnvPlugin from './src/bun.plugin'

Bun.plugin(
	bunEnvPlugin({
		importMetaEnv: false,
		verbose: true,
	}),
)

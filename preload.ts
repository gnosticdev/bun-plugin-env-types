import bunEnvPlugin from './src/plugin'

Bun.plugin(
	bunEnvPlugin({
		importMetaEnv: false,
		verbose: true,
	}),
)

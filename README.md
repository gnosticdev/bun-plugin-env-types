# Bun Plugin Env Types

Get autocomplete for your environment variables without manual configuration.

## Overview

I just wanted type-safe environment variables availabe on `process.env` and `Bun.env` without having to manually add themm. So, I figure why not use the Bun plugin system to make a plugin that does this on the fly.

Can be used in 3 ways:

1) [Runtime Plugins](https://bun.sh/docs/runtime/plugins) - generate the env.d.ts file whenever you use a `bun` command. i.e. `bun run`, `bun build`, `bun ./script.ts`, etc.
2) [Build Plugins](https://bun.sh/docs/bundler#plugins) - generate the file whenever you run your build script (like an esbuild plugin).
3) [Npx/Bunx] - just run the plugin directly with `bunx bun-plugin-env-types` and it will generate the file for you.

## Installation

```zsh
bun add -d bun-plugin-env-types
```

## Usage

You have 2 options:

1. Use as a runtime plugin in bunfig.toml
2. Use as a `Bun.build` plugin

***

### Runtime Plugin

[Runtime Plugins](https://bun.sh/docs/runtime/plugins) are cool bc they allow you to run files when other bun processes run. In particular, it is most handy to use the `preload` functionality so it runs before any other process runs. You just add the file to the `preload` array in the `bunfig.toml` file.

#### Example

1. create a file to preload like `preload.ts`.
2. import and call the plugin:

```ts
// ./preload.ts
import envPlugin from 'bun-plugin-env-types'

envPlugin()
```

3.add the file to the `bunfig.toml` file in the `preload` array:

```toml
preload = [
  "./preload.ts"
]
```

***

### Build Plugin

[Build Plugins](https://bun.sh/docs/bundler#plugins) run alongside the bundler, whenever your build script runs. To use it:

```ts
// ./build.ts
import envPlugin from 'bun-plugin-env-types'

Bun.build({
    entrypoints: ['src/index.ts'],
    plugins: [envPlugin()]
})
```

Thats pretty much it. You will end up with an `env.d.ts` file in your project that looks like this

```zsh
# ./.env
SECRET_KEY="sshhhhh"
DB_URL="https://long-production-url.com"
```

```ts
// ./env.d.ts
declare namespace NodeJS {
    export interface ProcessEnv {
        SECRET_KEY: string
        DB_URL: string
    }
}
```

***

### Notes

- You can modify the generated d.ts file and your changes will not be overwritten.
- You can access your environment variables via `process.env`, `Bun.env`, or `import.meta.env` with autocomplete.

### Npx/Bunx

You can also run the plugin directly with `bunx bun-plugin-env-types` and it will generate the file for you.

```bash
# Generate type definitions for all .env files
bunx bun-plugin-env-types

# Generate type definitions for a specific environment
bunx bun-plugin-env-types --env production

# Generate type definitions for a specific environment with custom output file
bunx bun-plugin-env-types custom-env.d.ts --env development
```

The `--env` flag can be used with any environment name that corresponds to a matching `.env.[environment]` file in your project.

This allows you to generate type definitions for any specific environment rather than merging all environment variables from different .env files.

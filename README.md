# Bun Plugin Env Types

Get autocomplete for your environment variables without manual configuration.

## Overview

Yes, I'm aware that interface merging NodeJS.ProcessEnv does the job most of the time. That is mostly sufficient, that is until you have 20 environment variables and you make a change to one or all of them and you forget to update your emv.d.ts. So, like so many plugins before this one, it was made out of frustration and a long, needless debugging session. 

## Can be used in 3 ways:

1) (recommended) [Runtime Plugins](https://bun.sh/docs/runtime/plugins) - generate the env.d.ts file whenever you use a `bun` command. i.e. `bun run`, `bun build`, `bun ./script.ts`, etc.
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

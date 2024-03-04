# Bun Plugin Env Types

Get autocomplete on those pesky .env files without manual configuration.

## Overview

I just wanted my environment variables availabe on `process.env` and `Bun.env` without having to do it manually. So, I figure why not use the Bun plugin system to make a plugin that does this on the fly.

## Installation

```zsh
bun i bun-plugin-env-types
```

## Usage

You have 2 options:

1. Use as a runtime plugin in bunfig.toml
2. Use as a `Bun.build` plugin

### Runtime Plugin

[Runtime Plugins](https://bun.sh/docs/runtime/plugins) are cool bc they allow you to run files when other bun processes run. To use it:

1. create a file like `preload.ts`.
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

### Build Plugin

```ts
// ./build.ts
import envPlugin from 'bun-plugin-env-types'

Bun.build({
    entrypoints: ['src/index.ts'],
    plugins: [
        envPlugin()
    ]
})
```

Thats pretty much it. Now you will end up with an `env.d.ts` file in your project that looks like this

```zsh
# ./.env
SECRET_KEY="abc123"
```

```ts
// ./env.d.ts
declare namespace NodeJS {
 export interface ProcessEnv {
      SECRET_KEY: string
    }
  }
```

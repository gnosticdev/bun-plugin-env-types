# Bun Plugin Env Types

Get autocomplete on those pesky .env files without manual configuration.

## Overview

I think a lot of people are like me and want to have their environment variables availabe on process.env and Bun.env. Well, I figure why not use the Bun plugin system to make a plugin that does this on the fly.

## Installation

```zsh

git clone https://github.com/@gnosticdev/bun-plugin-env-types
```

or...

```zsh
# bun.plugin.ts

cmd + c
cmd + v
```

sorry no time to publish 😂

## Usage

You have 2 options:

1. Use as a runtime plugin in bunfig.toml
2. Use as a `Bun.build` plugin

### Runtime Plugin

Import the plugin to  file in your project and add it to the `bunfig.toml` file.

```toml
preload = [
  "bun.plugin.ts"
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

declare module 'bun' {
    interface Env extends NodeJS.ProcessEnv {}
}
```

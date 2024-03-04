# Bun Plugin Env Types

## Overview

I think a lot of people are like me and want to have their environment variables availabe on process.env and Bun.env. Well, I figure why not use the Bun plugin system to make a plugin that does this on the fly.

## Installation

```zsh
# not on npm yet
cmd + c
cmd + v
```

Just use the bun.plugin.ts file in your project and add it to the `bunfig.toml` file.

```toml
preload = [
  "bun.plugin.ts"
]
```

Or, use it as a build plugin

```ts
import envPlugin from 'bun-plugin-env-types'

Bun.build({
    entrypoints: ['src/index.ts'],
    plugins: [
        envPlugin()
  ]
})
```

Thats pretty much it. Now you will end up with an `env.d.ts` file in your project that looks like this

```ts
declare

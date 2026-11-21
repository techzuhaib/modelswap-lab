# Development learnings

- Prisma schema blocks require newlines between attributes. The initial compact generator and datasource declarations failed validation. Reformatted them before retrying.
- The first npm install failed because the sandbox could not create the default home cache. Set `npm_config_cache` to a writable temporary directory.
- Prisma engine download required network permission. After generation, `prisma db push` succeeded locally.
- The `tsx` CLI attempted to open a blocked IPC socket in this environment. Running the seed with `node --import tsx` worked.
- Browser tests initially could not bind a localhost port under the default sandbox and Chromium was absent. Enabled the approved local network permission for the test process and installed Playwright Chromium to a temporary cache; the full browser workflow then passed.
- ESLint initially scanned generated `.next` files after a build. Added explicit generated-file ignores to the flat config.

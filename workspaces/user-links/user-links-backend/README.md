# User links backend

# Description
Backend pluguin for storing user links
## Installation

```bash
# From backstage root directory
yarn --cwd packages/backend add @internal/backstage-plugin-user-links-backend
```

Then add the plugin to your backend in `packages/backend/src/index.ts`:

```ts
const backend = createBackend();
// ...
backend.add(import('@internal/backstage-plugin-user-links-backend'));
```


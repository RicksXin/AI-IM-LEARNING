# flash_auth

`flash_auth` is the Flash IM authentication package. It owns authentication API calls, auth entities, token storage abstractions, and the current playground authentication views.

The React Native app can keep importing the old playground auth path during migration because `client/flash_im/src/playground/auth` re-exports this package.

## Structure

```text
src
├── api
├── model
├── view
└── index.ts
```

## Boundary

- `api`: HTTP request layer for auth endpoints.
- `model`: auth entities, JSON parsing helpers, and token store abstraction.
- `view`: reusable auth UI components currently used by the playground.

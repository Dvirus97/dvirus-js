# Web Library

Framework-agnostic browser utilities for TypeScript projects.

## Install

```bash
npm install @dvirus-js/web
```

## Exports

- `isBrowser`: true when running in a browser runtime.
- `whenDomReady`: runs a callback once the DOM is ready.

## Example

```ts
import { isBrowser, whenDomReady } from '@dvirus-js/web';

if (isBrowser()) {
  whenDomReady(() => {
    console.log('DOM is ready');
  });
}
```
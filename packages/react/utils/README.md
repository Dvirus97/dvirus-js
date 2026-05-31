# React Utils Library

Small, framework-focused helpers for React apps.

## Install

```bash
npm install @dvirus-js/react
```

## Exports

- `cx`: join class names from strings and conditional maps.
- `toDataAttributes`: map values into `data-*` attributes.

## Example

```ts
import { cx, toDataAttributes } from '@dvirus-js/react';

const className = cx('btn', { 'btn-primary': true, disabled: false });
const dataAttrs = toDataAttributes({ state: 'active', index: 2 });
```

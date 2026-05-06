# Utils Library

Shared utility package for string transforms, async helpers, HTTP calls, typed accessors, lightweight signals, and branded types.

## Install

```bash
npm install @dvirus-js/utils
```

## Exports

- `normalizeString`, `convertCase`: normalize text and convert between cases.
- `tryCatch`, `tryCatchAsync`, `Result`: tuple-style and object-style error handling.
- `http`: small `fetch` wrapper with `get`, `post`, `put`, `patch`, `delete`.
- `groupBy`, `toArray`, `getProp`: data shaping helpers.
- `delay`, `clamp`, `debounce`: async and timing utilities.
- `signal`, `computed`, `effect`, `linkedSignal`, `resource`: minimal reactive primitives.
- `parseRichText`: parse supported inline HTML tags into styled text segments.
- `createBrand`, `NumericString`: nominal typing helpers.

## Examples

### Cases and collections

```ts
import { convertCase, groupBy, normalizeString, toArray } from '@dvirus-js/utils';

const value = 'HelloWorld_example-string';

normalizeString(value); // 'hello world example string'
convertCase(value, 'snake_case'); // 'hello_world_example_string'

groupBy(
  [
    { type: 'a', value: 1 },
    { type: 'b', value: 2 },
    { type: 'a', value: 3 },
  ],
  (item) => item.type,
);

toArray('item'); // ['item']
```

### Errors and HTTP

```ts
import { Result, http, tryCatch, tryCatchAsync } from '@dvirus-js/utils';

const [parsed, parseError] = tryCatch(() => JSON.parse('{"ok":true}'));
const [todo, requestError] = await tryCatchAsync(
  http.get<{ id: number; title: string }>('/api/todo/1'),
);

const safeDivide = Result.func((a: number, b: number) => {
  if (b === 0) throw new Error('Cannot divide by zero');
  return a / b;
}, 10, 2);

if (!parseError && !requestError && safeDivide.isOk()) {
  console.log(parsed, todo, safeDivide.value);
}
```

### Paths, timing, and text parsing

```ts
import { clamp, debounce, delay, getProp, parseRichText } from '@dvirus-js/utils';

const user = { profile: { name: 'Ada' } };
const name = getProp(user, 'profile.name'); // 'Ada'

await delay(200);
const page = clamp(1, 12, 10); // 10
const save = debounce(() => console.log('saved'), 300);

const segments = parseRichText('Hello <b>world</b>');
```

### Signals and branded types

```ts
import {
  NumericString,
  computed,
  effect,
  signal,
} from '@dvirus-js/utils';

const count = signal(0);
const doubled = computed(() => count() * 2);

const ref = effect(() => {
  console.log(count(), doubled());
});

count.set(2);

const userId = NumericString('12345');
console.log(userId);

ref.destroy();
```

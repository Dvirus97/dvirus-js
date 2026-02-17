# Utils Library

This package provides a collection of utility functions for string manipulation, data transformation, async handling, HTTP requests, and more. It is designed to be a shared resource for other packages in the monorepo.

## Available Utilities

### `convert-cases.ts`
Convert strings between various case formats (camelCase, PascalCase, snake_case, kebab-case, etc.) and normalize strings.

```typescript
import { convertCase, normalizeString } from './lib/convert-cases';

const input = 'HelloWorld_example-string';
console.log(normalizeString(input)); // 'hello world example string'
console.log(convertCase(input, 'snake_case')); // 'hello_world_example_string'
console.log(convertCase(input, 'camelCase')); // 'helloWorldExampleString'
```

### `tryCatch.ts`
Async error handling for promises, returning a tuple of [result, error].

```typescript
import { tryCatch } from './lib/tryCatch';

const [data, error] = await tryCatch(fetch('/api/data'));
if (error) {
  // handle error
}
```

### `http.ts`
Simple HTTP client for GET, POST, PUT, PATCH, DELETE requests using fetch.

```typescript
import { http } from './lib/http';

const data = await http.get('/api/data');
const created = await http.post('/api/data', { name: 'test' });
```

### `group-by.ts`
Group array items by a key.

```typescript
import { groupBy } from './lib/group-by';

const arr = [ { type: 'a', v: 1 }, { type: 'b', v: 2 }, { type: 'a', v: 3 } ];
const grouped = groupBy(arr, x => x.type);
// { a: [{type:'a',v:1},{type:'a',v:3}], b: [{type:'b',v:2}] }
```

### `delay.ts`
Delay execution, clamp values, and debounce functions.

```typescript
import { delay, clamp, debounce } from './lib/delay';

await delay(500); // waits 500ms
const clamped = clamp(0, 10, 5); // 5
const debounced = debounce(() => console.log('run'), 300);
debounced();
```

### `getProp.ts`
Get a deeply nested property from an object using a string path, with type safety.

```typescript
import { getProp } from './lib/getProp';

const obj = { a: { b: { c: 42 } } };
const value = getProp(obj, 'a.b.c'); // 42
```

### `Result.ts`
A Result type for functional error handling (ok/err pattern).

```typescript
import { Result } from './lib/Result';

const res = Result.func(() => JSON.parse('{bad json}'));
if (res.isErr()) {
  console.error(res.error);
}
```

### `toObject.ts`
Convert an array to an object by key, or ensure a value is always an array.

```typescript
import { toObject, toArray } from './lib/toObject';

const arr = [{ id: 1 }, { id: 2 }];
const obj = toObject(arr, x => x.id); // { '1': {id:1}, '2': {id:2} }
const arr2 = toArray('foo'); // ['foo']
```

---

This library was generated with [Nx](https://nx.dev).

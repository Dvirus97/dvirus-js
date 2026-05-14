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
const [todo, requestError] = await tryCatchAsync(http.get<{ id: number; title: string }>('/api/todo/1'));

const safeDivide = Result.func(
  (a: number, b: number) => {
    if (b === 0) throw new Error('Cannot divide by zero');
    return a / b;
  },
  10,
  2,
);

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

## Rich text parser (`parseRichText`)

`parseRichText` converts a string with a limited set of HTML-like tags into
structured text segments.

Each segment includes:

- `text`: plain text for the segment.
- `tagNames`: comma-separated active tag names (for quick display/debug).
- `tagNamesList`: active tag names as an array.
- `style`: inline CSS string built from active tags.

### Supported tags

Default rich tags:

- `b`, `strong`
- `i`, `em`
- `u`
- `s`
- `mark`
- `small`
- `h1`, `h2`, `h3`, `h4`, `h5`, `h6`
- `div`
- `p`
- `code`

Default self-closing tags:

- `br`

Notes:

- Tag matching is case-insensitive.
- Nested tags are supported.
- Unsupported tags are treated as normal text.
- Tags with attributes are not parsed as tags (for example `<b class="x">`).

### Basic example

```ts
import { parseRichText } from '@dvirus-js/utils';

const input = 'Hello <b>world <i>now</i></b>!<br/>Done';
const segments = parseRichText(input);

/*
[
  {
    text: 'Hello ',
    tagNames: '',
    tagNamesList: [],
    style: ''
  },
  {
    text: 'world ',
    tagNames: 'b',
    tagNamesList: ['b'],
    style: 'font-weight: bold'
  },
  {
    text: 'now',
    tagNames: 'b,i',
    tagNamesList: ['b', 'i'],
    style: 'font-weight: bold; font-style: italic'
  },
  {
    text: '!',
    tagNames: '',
    tagNamesList: [],
    style: ''
  },
  {
    text: '',
    tagNames: 'br',
    tagNamesList: ['br'],
    style: 'display: block'
  },
  {
    text: 'Done',
    tagNames: '',
    tagNamesList: [],
    style: ''
  }
]
*/
```

### Add custom rich tags

You can register additional tags at runtime:

```ts
import { parseRichText } from '@dvirus-js/utils';

parseRichText.addTag({
  tag: 'newTag',
  style: 'border:1px solid black, border-radius:1rem',
});

const out = parseRichText('Use <newTag>npm run build</newTag>');
```

You can also register multiple tags in one call:

```ts
import { parseRichText } from '@dvirus-js/utils';

parseRichText.addTag([
  { tag: 'sub', style: 'vertical-align: sub; font-size: smaller' },
  { tag: 'sup', style: 'vertical-align: super; font-size: smaller' },
]);
```

### Add custom self-closing tags

```ts
import { parseRichText } from '@dvirus-js/utils';

parseRichText.addSelfClosingTag({ tag: 'hr', style: 'display: block; border-top: 1px solid #ddd' });

const out = parseRichText('Line one<hr/>Line two');
```

### Alias tags to the same style key

Use `tagName` when you want multiple tags to map to the same style entry:

```ts
import { addRichTextTag } from '@dvirus-js/utils';

addRichTextTag({ tag: 'strong', tagName: 'b' });
```

This behaves like the built-in `strong` -> `b` and `em` -> `i` aliases.

### Signals and branded types

```ts
import { NumericString, computed, effect, signal } from '@dvirus-js/utils';

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

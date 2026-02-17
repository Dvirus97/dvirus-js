# Utils Library

This package provides utility functions for string manipulation and other common tasks. It is designed to be a shared resource for other packages in the monorepo.

## Available Utilities

### `convert-cases.ts`

A utility for converting strings between various case formats (camelCase, PascalCase, snake_case, kebab-case, etc.) and normalizing strings.

#### Functions

- `normalizeString(input: string): string`  
  Normalizes any string to lowercase with single spaces, handling special characters, extra spaces, and different formats.

- `convertCase(input: string, caseType: CaseType): string`  
  Converts a string to the specified case type. Supported case types:
  - 'lowercase'
  - 'UPPERCASE'
  - 'Title Case'
  - 'kebab-case'
  - 'snake_case'
  - 'camelCase'
  - 'PascalCase'
  - 'dot.case'
  - 'path/case'
  - 'Sentence case'
  - 'Header-Case'
  - 'reverse'

#### Usage Example

```typescript
import { convertCase, normalizeString } from './lib/convert-cases';

const input = 'HelloWorld_example-string';

console.log(normalizeString(input)); // 'hello world example string'
console.log(convertCase(input, 'snake_case')); // 'hello_world_example_string'
console.log(convertCase(input, 'camelCase')); // 'helloWorldExampleString'
console.log(convertCase(input, 'Title Case')); // 'Hello World Example String'
console.log(convertCase(input, 'reverse')); // 'gnirts elpmaxe dlrow olleh'
```
---

This library was generated with [Nx](https://nx.dev).

/**
 * Maps an HTML tag name to a CSS class applied to the segment.
 * To add a new supported tag, add an entry here and a matching `.text--<style>` CSS class.
 */
export const RICH_TEXT_TAGS = new Map<string, string>([
  ['b', 'b'],
  ['i', 'i'],
  ['u', 'u'],
  ['s', 's'],
  ['mark', 'mark'],
  ['small', 'small'],
  ['strong', 'b'],
  ['em', 'i'],
  ['sup', 'sup'],
  ['sub', 'sub'],
  ['h1', 'h1'],
  ['h2', 'h2'],
  ['h3', 'h3'],
  ['h4', 'h4'],
  ['h5', 'h5'],
  ['h6', 'h6'],
  ['code', 'code'],
  ['p', 'p'],
  ['div', 'div'],
  ['ul', 'ul'],
  ['ol', 'ol'],
  ['li', 'li'],
]);

/**
 * Set of tag names that act as block/container-level elements.
 * Their styles are NOT inherited by nested text segments — only their tag name
 * is tracked in `containerTagNames` so the renderer can wrap groups accordingly.
 */
export const BLOCK_TAGS = new Set<string>([
  'div',
  'p',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
]);

/**
 * Prefix used for generated CSS class names.
 * Change via `setCssClassPrefix()`.
 */
let _cssClassPrefix = 'rtp-';

export function getCssClassPrefix(): string {
  return _cssClassPrefix;
}

export function setCssClassPrefix(prefix: string): void {
  _cssClassPrefix = prefix;
}

/**
 * Maps self-closing HTML tag names to parser style keys.
 * Example: `<br/>` creates an empty segment with the `br` style key.
 */
export const SELF_CLOSING_TAGS = new Map<string, string>([
  ['br', 'br'],
  ['hr', 'hr'],
]);

export const styleTagMap = new Map<string, Map<string, string>>([
  ['b', new Map([['font-weight', 'bold']])],
  ['i', new Map([['font-style', 'italic']])],
  ['u', new Map([['text-decoration', 'underline']])],
  ['s', new Map([['text-decoration', 'line-through']])],
  ['mark', new Map([['background-color', 'yellow']])],
  ['small', new Map([['font-size', 'smaller']])],
  ['strong', new Map([['font-weight', 'bold']])],
  ['em', new Map([['font-style', 'italic']])],
  [
    'sub',
    new Map([
      ['vertical-align', 'sub'],
      ['font-size', 'smaller'],
    ]),
  ],
  [
    'sup',
    new Map([
      ['vertical-align', 'super'],
      ['font-size', 'smaller'],
    ]),
  ],
  [
    'h1',
    new Map([
      ['font-size', '2em'],
      ['font-weight', 'bold'],
    ]),
  ],
  [
    'h2',
    new Map([
      ['font-size', '1.5em'],
      ['font-weight', 'bold'],
    ]),
  ],
  [
    'h3',
    new Map([
      ['font-size', '1.17em'],
      ['font-weight', 'bold'],
    ]),
  ],
  [
    'h4',
    new Map([
      ['font-size', '1em'],
      ['font-weight', 'bold'],
    ]),
  ],
  [
    'h5',
    new Map([
      ['font-size', '0.83em'],
      ['font-weight', 'bold'],
    ]),
  ],
  [
    'h6',
    new Map([
      ['font-size', '0.67em'],
      ['font-weight', 'bold'],
    ]),
  ],
  ['code', new Map([['font-family', 'monospace']])],
  ['p', new Map([['margin-block', '1em']])],
  ['div', new Map([['display', 'block']])],
  ['ul', new Map([['padding-left', '1.5em']])],
  ['ol', new Map([['padding-left', '1.5em']])],
  ['li', new Map([['margin-block', '0.5em']])],
  [
    'br',
    new Map([
      ['display', 'block'],
      ['height', '1em'],
    ]),
  ],
  [
    'hr',
    new Map([
      ['display', 'block'],
      ['border', '0'],
      ['border-top', '1px solid #ccc'],
      ['border-color', 'green'],
      ['margin', '1em 0'],
    ]),
  ],
]);

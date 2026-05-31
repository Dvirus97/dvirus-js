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
  ['span', 'span'],
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

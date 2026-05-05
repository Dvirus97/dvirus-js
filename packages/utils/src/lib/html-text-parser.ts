/**
 * Maps an HTML tag name to a CSS class applied to the segment.
 * To add a new supported tag, add an entry here and a matching `.text--<style>` CSS class.
 */
const RICH_TEXT_TAGS: Record<string, string> = {
  b: 'bold',
  i: 'italic',
  u: 'underline',
  s: 'strikethrough',
  mark: 'highlight',
  small: 'small',
  strong: 'bold',
  em: 'italic',
};

const TAG_NAMES = Object.keys(RICH_TEXT_TAGS).join('|');
const TAG_REGEX = new RegExp(`<\\/?(${TAG_NAMES})>`, 'gi');

/**
 * Represents a parsed segment of rich text with active style classes.
 */
export interface TextSegment {
  text: string;
  /** CSS class names derived from the active tags (e.g. `['bold', 'italic']`) */
  styles: string[];
  /** Precomputed CSS class string (e.g. 'text--bold text--italic') */
  cssClass: string;
}

/**
 * Parses a string containing supported inline tags into typed segments.
 * Supports nested tags. All other content is treated as plain text.
 *
 * Supported tags (add more in `RICH_TEXT_TAGS`):
 * `<b>` / `<strong>`, `<i>` / `<em>`, `<u>`, `<s>`, `<mark>`, `<small>`
 *
 * @example
 * parseRichText('Hello <b>world</b>!')
 * // [
 * //   { text: 'Hello ', styles: [], cssClass: '' },
 * //   { text: 'world', styles: ['bold'] },
 * //   { text: '!', styles: [] },
 * // ]
 */
export function parseRichText(input: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const activeStyles = new Map<string, number>(); // style → nesting depth
  let lastIndex = 0;

  for (const match of input.matchAll(TAG_REGEX)) {
    const index = match.index;

    if (index > lastIndex) {
      segments.push({
        text: input.slice(lastIndex, index),
        styles: [...activeStyles.keys()],
        cssClass: [...activeStyles.keys()].map((style) => `text--${style}`).join(' '),
      });
    }

    const isClosing = match[0][1] === '/';
    const style = RICH_TEXT_TAGS[match[1]?.toLowerCase() ?? 0] ?? '';

    if (isClosing) {
      const depth = (activeStyles.get(style) ?? 1) - 1;
      if (depth <= 0) {
        activeStyles.delete(style);
      } else {
        activeStyles.set(style, depth);
      }
    } else {
      activeStyles.set(style, (activeStyles.get(style) ?? 0) + 1);
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < input.length) {
    segments.push({
      text: input.slice(lastIndex),
      styles: [...activeStyles.keys()],
      cssClass: [...activeStyles.keys()].map((style) => `text--${style}`).join(' '),
    });
  }

  return segments;
}

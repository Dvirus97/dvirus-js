/**
 * Maps an HTML tag name to a CSS class applied to the segment.
 * To add a new supported tag, add an entry here and a matching `.text--<style>` CSS class.
 */
const RICH_TEXT_TAGS: Record<string, string> = {
  b: 'b',
  i: 'i',
  u: 'u',
  s: 's',
  mark: 'mark',
  small: 'small',
  strong: 'b',
  em: 'i',
  sup: 'sup',
  sub: 'sub',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  code: 'code',
  p: 'p',
  div: 'div',
};

/**
 * Maps self-closing HTML tag names to parser style keys.
 * Example: `<br/>` creates an empty segment with the `br` style key.
 */
const SELF_CLOSING_TAGS: Record<string, string> = {
  br: 'br',
  hr: 'hr',
};

const styleTagMap: Record<string, Map<string, string>> = {
  b: new Map([['font-weight', 'bold']]),
  i: new Map([['font-style', 'italic']]),
  u: new Map([['text-decoration', 'underline']]),
  s: new Map([['text-decoration', 'line-through']]),
  mark: new Map([['background-color', 'yellow']]),
  small: new Map([['font-size', 'smaller']]),
  strong: new Map([['font-weight', 'bold']]),
  em: new Map([['font-style', 'italic']]),
  sub: new Map([
    ['vertical-align', 'sub'],
    ['font-size', 'smaller'],
  ]),
  sup: new Map([
    ['vertical-align', 'super'],
    ['font-size', 'smaller'],
  ]),
  h1: new Map([
    ['font-size', '2em'],
    ['font-weight', 'bold'],
  ]),
  h2: new Map([
    ['font-size', '1.5em'],
    ['font-weight', 'bold'],
  ]),
  h3: new Map([
    ['font-size', '1.17em'],
    ['font-weight', 'bold'],
  ]),
  h4: new Map([
    ['font-size', '1em'],
    ['font-weight', 'bold'],
  ]),
  h5: new Map([
    ['font-size', '0.83em'],
    ['font-weight', 'bold'],
  ]),
  h6: new Map([
    ['font-size', '0.67em'],
    ['font-weight', 'bold'],
  ]),
  code: new Map([
    ['font-family', 'monospace'],
    ['background-color', '#f5f5f5'],
    ['padding', '2px 4px'],
    ['border-radius', '4px'],
  ]),
  p: new Map([['margin', '1em 0']]),
  div: new Map([['display', 'block']]),
  br: new Map([['display', 'block']]),
  hr: new Map([
    ['display', 'block'],
    ['border', '0'],
    ['border-top', '1px solid #ccc'],
    ['border-color', 'green'],
    ['margin', '1em 0'],
  ]),
};

const createTagSegment = (
  activeTagsKeys: string[],
  input: string,
  lastIndex: number,
  index: number,
  text?: string,
): TextSegment => {
  return {
    tagNames: activeTagsKeys.join(','),
    tagNamesList: activeTagsKeys,
    text: text ?? input.slice(lastIndex, index),
    style: activeTagsKeys
      .map((tag) =>
        [...(styleTagMap[tag]?.entries() ?? [])]
          .map(([k, v]) => `${k}: ${v}`)
          .join('; '),
      )
      .filter(Boolean)
      .join('; '),
    styleObject: Object.fromEntries(
      activeTagsKeys.flatMap((tag) => Array.from(styleTagMap[tag] ?? [])),
    ),
  };
};

const getTagNames = (): string => Object.keys(RICH_TEXT_TAGS).join('|');
const getSelfClosingTagNames = (): string =>
  Object.keys(SELF_CLOSING_TAGS).join('|');
const getTagRegex = (): RegExp =>
  new RegExp(
    `<\\/?(${getTagNames()})>|<(${getSelfClosingTagNames()})\\s*/?>`,
    'gi',
  );

/**
 * Represents a parsed segment of rich text with active style classes.
 */
export interface TextSegment {
  /** The text content of the segment (e.g. 'Hello world') */
  text: string;
  /** Comma-separated list of active tag names (e.g. 'b,i') */
  tagNames: string;
  /** Array of active tag names (e.g. ['b', 'i']) */
  tagNamesList: string[];
  /** CSS style string (e.g. 'font-weight: bold; font-style: italic') */
  style: string;
  /** Optional style object for easier programmatic access (e.g. { 'font-weight': 'bold', 'font-style': 'italic' }) */
  styleObject?: Record<string, string>;
}

/**
 * Parses a string containing supported inline tags into typed segments.
 * Supports nested tags. All other content is treated as plain text.
 *
 * Supported tags (add more in `RICH_TEXT_TAGS`):
 * `<b>` / `<strong>`, `<i>` / `<em>`, `<u>`, `<s>`, `<mark>`, `<small>`,
 * `<h1>` - `<h6>`, `<code>`, `<p>`, `<div>`
 *
 * Supported self-closing tags (add more in `SELF_CLOSING_TAGS`):
 * `<br/>`
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

  for (const match of input.matchAll(getTagRegex())) {
    const index = match.index;

    if (index > lastIndex) {
      segments.push(
        createTagSegment([...activeStyles.keys()], input, lastIndex, index),
      );
    }

    // match[2] is set for self-closing tags (e.g. <br/>)
    const selfClosingTag = match[2]?.toLowerCase();
    if (selfClosingTag && selfClosingTag in SELF_CLOSING_TAGS) {
      segments.push(
        createTagSegment(
          [...activeStyles.keys(), selfClosingTag],
          input,
          lastIndex,
          index,
          '',
        ),
      );
      lastIndex = index + match[0].length;
      continue;
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
    segments.push(
      createTagSegment(
        [...activeStyles.keys()],
        input,
        lastIndex,
        input.length,
      ),
    );
  }

  return segments;
}

export function addRichTextTag(tag: {
  tag: string;
  tagName?: string;
  style?: Record<string, string>;
}): void;
export function addRichTextTag(
  tags: { tag: string; tagName?: string; style?: Record<string, string> }[],
): void;
export function addRichTextTag(
  tag:
    | { tag: string; tagName?: string; style?: Record<string, string> }
    | { tag: string; tagName?: string; style?: Record<string, string> }[],
) {
  if (Array.isArray(tag)) {
    tag.forEach((t) => {
      addRichTextTag(t);
    });
    return;
  }

  const key = tag.tagName ?? tag.tag;
  RICH_TEXT_TAGS[key] = key;
  if (tag.style != undefined && Object.keys(tag.style)) {
    const map = styleTagMap[key] ?? new Map<string, string>();
    Object.entries(tag.style).forEach(([k, v]) => map.set(k, v));
    styleTagMap[key] = map;
  }
}

export function addSelfClosingTag(tag: {
  tag: string;
  tagName?: string;
  style?: Record<string, string>;
}): void;
export function addSelfClosingTag(
  tags: { tag: string; tagName?: string; style?: Record<string, string> }[],
): void;
export function addSelfClosingTag(
  tag:
    | { tag: string; tagName?: string; style?: Record<string, string> }
    | { tag: string; tagName?: string; style?: Record<string, string> }[],
) {
  if (Array.isArray(tag)) {
    tag.forEach((t) => {
      addSelfClosingTag(t);
    });
    return;
  }

  const key = tag.tagName ?? tag.tag;
  SELF_CLOSING_TAGS[tag.tag] = key;
  if (tag.style != undefined && Object.keys(tag.style)) {
    const map = styleTagMap[key] ?? new Map<string, string>();
    Object.entries(tag.style).forEach(([k, v]) => map.set(k, v));
    styleTagMap[key] = map;
  }
}

parseRichText.addTag = addRichTextTag;
parseRichText.addSelfClosingTag = addSelfClosingTag;

import {
  RICH_TEXT_TAGS,
  SELF_CLOSING_TAGS,
  BLOCK_TAGS,
  setCssClassPrefix,
} from './constant';
import {
  createTagSegment,
  generateStylesheet,
  getStylesheet,
  getTagRegex,
  groupByBlocks,
  setStyleMap,
} from './methods';
import { TextSegment } from './types';

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
    if (selfClosingTag && SELF_CLOSING_TAGS.has(selfClosingTag)) {
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
    const style = RICH_TEXT_TAGS.get(match[1]?.toLowerCase() ?? '') ?? '';

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

export function setRichTextTag(tag: {
  tag: string;
  tagName?: string;
  style?: Record<string, string>;
}): void;
export function setRichTextTag(
  tags: { tag: string; tagName?: string; style?: Record<string, string> }[],
): void;
export function setRichTextTag(
  tag:
    | { tag: string; tagName?: string; style?: Record<string, string> }
    | { tag: string; tagName?: string; style?: Record<string, string> }[],
) {
  if (Array.isArray(tag)) {
    tag.forEach((t) => {
      setRichTextTag(t);
    });
    return;
  }

  const key = tag.tagName ?? tag.tag;
  RICH_TEXT_TAGS.set(tag.tag, key);
  if (tag.style != undefined && Object.keys(tag.style).length) {
    setStyleMap(key, tag.style);
  }
}

export function setSelfClosingTag(tag: {
  tag: string;
  tagName?: string;
  style?: Record<string, string>;
}): void;
export function setSelfClosingTag(
  tags: { tag: string; tagName?: string; style?: Record<string, string> }[],
): void;
export function setSelfClosingTag(
  tag:
    | { tag: string; tagName?: string; style?: Record<string, string> }
    | { tag: string; tagName?: string; style?: Record<string, string> }[],
) {
  if (Array.isArray(tag)) {
    tag.forEach((t) => {
      setSelfClosingTag(t);
    });
    return;
  }

  const key = tag.tagName ?? tag.tag;
  SELF_CLOSING_TAGS.set(tag.tag, key);
  if (tag.style != undefined && Object.keys(tag.style).length) {
    setStyleMap(key, tag.style);
  }
}

parseRichText.setTag = setRichTextTag;
parseRichText.setSelfClosingTag = setSelfClosingTag;
parseRichText.setBlockTag = (tag: string) => BLOCK_TAGS.add(tag);
parseRichText.removeBlockTag = (tag: string) => BLOCK_TAGS.delete(tag);
parseRichText.setCssClassPrefix = setCssClassPrefix;
if ('document' in globalThis) {
  parseRichText.generateStylesheet = generateStylesheet;
}
parseRichText.getStylesheet = getStylesheet;
parseRichText.groupByBlocks = groupByBlocks;

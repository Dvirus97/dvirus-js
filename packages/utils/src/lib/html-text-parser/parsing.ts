import { RICH_TEXT_TAGS, SELF_CLOSING_TAGS } from './constant';
import { groupSegments as _groupSegments } from './grouping';
import { createTagSegment } from './segment';
import { getTagRegex } from './tag-regex';
import { BlockGroup, TextSegment } from './types';

/**
 * Parses a rich text string into a flat array of typed segments.
 * Each segment carries its text, active tag names, CSS class, and inline style info.
 *
 * @example
 * parseSegments('Hello <b>world</b>!')
 * // [
 * //   { text: 'Hello ',  tagNamesList: [],    cssClass: '' },
 * //   { text: 'world',   tagNamesList: ['b'], cssClass: 'rtp-b' },
 * //   { text: '!',       tagNamesList: [],    cssClass: '' },
 * // ]
 */
export function parseSegments(input: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const activeStyles = new Map<string, number>();
  let lastIndex = 0;

  for (const match of input.matchAll(getTagRegex())) {
    const index = match.index;

    if (index > lastIndex) {
      segments.push(
        createTagSegment([...activeStyles.keys()], input, lastIndex, index),
      );
    }

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
      if (depth <= 0) activeStyles.delete(style);
      else activeStyles.set(style, depth);
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

/**
 * Groups a flat segment array by block/container context.
 * Consecutive segments sharing the same container tags are merged into one `BlockGroup`.
 *
 * @example
 * groupSegments(parseSegments('<p>Hello <b>world</b></p> outside'))
 * // [
 * //   { containerTagNames: ['p'], segments: [...] },
 * //   { containerTagNames: [],    segments: [...] },
 * // ]
 */
export function groupSegments(segments: TextSegment[]): BlockGroup[] {
  return _groupSegments(segments);
}

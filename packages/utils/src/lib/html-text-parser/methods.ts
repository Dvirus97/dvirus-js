import {
  BLOCK_TAGS,
  getCssClassPrefix,
  RICH_TEXT_TAGS,
  SELF_CLOSING_TAGS,
  styleTagMap,
} from './constant';
import { TextSegment, BlockGroup } from './types';

export const createTagSegment = (
  activeTagsKeys: string[],
  input: string,
  lastIndex: number,
  index: number,
  text?: string,
): TextSegment => {
  const inlineTags = activeTagsKeys.filter((t) => !BLOCK_TAGS.has(t));
  const containerTags = activeTagsKeys.filter((t) => BLOCK_TAGS.has(t));

  return {
    tagNames: activeTagsKeys.join(','),
    tagNamesList: activeTagsKeys,
    text: text ?? input.slice(lastIndex, index),
    style: inlineTags
      .map((tag) =>
        [...(styleTagMap.get(tag)?.entries() ?? [])]
          .map(([k, v]) => `${k}: ${v}`)
          .join('; '),
      )
      .filter(Boolean)
      .join('; '),
    styleObject: Object.fromEntries(
      inlineTags.flatMap((tag) => Array.from(styleTagMap.get(tag) ?? [])),
    ),
    containerTagNames: containerTags,
    cssClass: inlineTags.map((t) => `${getCssClassPrefix()}${t}`).join(' '),
  };
};

export const getTagNames = (): string => [...RICH_TEXT_TAGS.keys()].join('|');
export const getSelfClosingTagNames = (): string =>
  [...SELF_CLOSING_TAGS.keys()].join('|');
export const getTagRegex = (): RegExp =>
  new RegExp(
    `<\\/?(${getTagNames()})>|<(${getSelfClosingTagNames()})\\s*/?>`,
    'gi',
  );

export function setStyleMap(key: string, style: Record<string, string>): void {
  const map = styleTagMap.get(key) ?? new Map<string, string>();
  Object.entries(style).forEach(([k, v]) => map.set(k, v));
  styleTagMap.set(key, map);
}

/**
 * Generates a CSS stylesheet string from all registered tags and their styles.
 * Each tag gets a class like `.rtp-b { font-weight: bold; }`.
 *
 * @example
 * const css = generateStylesheet();
 * // '.rtp-b { font-weight: bold; }\n.rtp-i { font-style: italic; }\n...'
 */
export function getStylesheet(): string {
  const lines: string[] = [];
  for (const [tag, styles] of styleTagMap) {
    if (styles.size === 0) continue;
    const props = [...styles.entries()]
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n');
    lines.push(`.${getCssClassPrefix()}${tag} {\n${props}\n}`);
  }
  return lines.join('\n');
}
export function generateStylesheet(): void {
  if ('document' in globalThis) {
    const stylesheet = getStylesheet();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _global = globalThis as any;

    const existingTag = _global.document.getElementById(
      'html-text-parser-styles',
    );

    if (existingTag) {
      existingTag.textContent = stylesheet;
      return;
    }

    const styleTag = _global.document.createElement('style');
    styleTag.textContent = stylesheet;
    styleTag.setAttribute('id', 'html-text-parser-styles');
    _global.document.head.appendChild(styleTag);
    return;
  }
  console.warn(
    '[html-text-parser] Cannot inject stylesheet: document is not available.',
  );
}

/**
 * Groups a flat array of segments by their block/container context.
 * Consecutive segments with the same `containerTagNames` are merged into one `BlockGroup`.
 *
 * @example
 * const groups = groupByBlocks(parseRichText('<div>Hello <b>world</b></div> outside'));
 * // [
 * //   { containerTagNames: ['div'], cssClass: 'rtp-div', segments: [...] },
 * //   { containerTagNames: [],      cssClass: '',        segments: [...] },
 * // ]
 */
export function groupByBlocks(segments: TextSegment[]): BlockGroup[] {
  const groups: BlockGroup[] = [];
  let current: BlockGroup | undefined;

  for (const segment of segments) {
    const key = segment.containerTagNames.join(',');
    const currentKey = current?.containerTagNames.join(',');

    if (key !== currentKey) {
      current = {
        containerTagNames: segment.containerTagNames,
        cssClass: segment.containerTagNames
          .map((t) => `${getCssClassPrefix()}${t}`)
          .join(' '),
        style: segment.containerTagNames
          .map((tag) =>
            [...(styleTagMap.get(tag)?.entries() ?? [])]
              .map(([k, v]) => `${k}: ${v}`)
              .join('; '),
          )
          .filter(Boolean)
          .join('; '),
        styleObject: Object.fromEntries(
          segment.containerTagNames.flatMap((tag) =>
            Array.from(styleTagMap.get(tag) ?? []),
          ),
        ),
        segments: [],
      };
      groups.push(current);
    }

    // current is always defined here — either from the previous iteration or just assigned above
    (current as BlockGroup).segments.push(segment);
  }

  return groups;
}

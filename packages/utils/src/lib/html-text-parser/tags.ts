import { BLOCK_TAGS, RICH_TEXT_TAGS, SELF_CLOSING_TAGS } from './constant';

type TagConfig = {
  tag: string;
  tagName?: string;
};

/**
 * Register a new supported tag for the parser.
 *
 * Use this when you want the parser to recognize custom tags and optionally map
 * them to another normalized tag key.
 *
 * @example
 * registerTag({ tag: 'kbd' });
 *
 * @example
 * registerTag([
 *   { tag: 'kbd' },
 *   { tag: 'del', tagName: 's' },
 * ]);
 */
export function setTag(tag: TagConfig): void;
export function setTag(tags: TagConfig[]): void;
export function setTag(tag: TagConfig | TagConfig[]): void {
  if (Array.isArray(tag)) {
    tag.forEach((t) => setTag(t));
    return;
  }

  const key = tag.tagName ?? tag.tag;
  RICH_TEXT_TAGS.set(tag.tag, key);
}

/**
 * Register a self-closing tag (for example `<br/>`, `<hr/>`) so it can be
 * parsed as an element even when there is no text content.
 *
 * @example
 * setSelfClosingTag({
 *   tag: 'divider',
 *   tagName: 'hr',
 * });
 */
export function setSelfClosingTag(tag: TagConfig): void;
export function setSelfClosingTag(tags: TagConfig[]): void;
export function setSelfClosingTag(tag: TagConfig | TagConfig[]): void {
  if (Array.isArray(tag)) {
    tag.forEach((t) => setSelfClosingTag(t));
    return;
  }

  const key = tag.tagName ?? tag.tag;
  SELF_CLOSING_TAGS.set(tag.tag, key);
}

/**
 * Mark a tag as a block/container tag.
 * Block tags wrap grouped segments (e.g. `p`, `div`, `ul`, `li`).
 */
export function setBlockTag(tag: string): void {
  BLOCK_TAGS.add(tag);
}

/**
 * Remove a tag from block/container behavior and treat it as inline.
 */
export function removeBlockTag(tag: string): void {
  BLOCK_TAGS.delete(tag);
}

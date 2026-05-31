/**
 * A parsed run of text with its active tag context.
 */
export interface TextSegment {
  /** Plain text content of this run */
  text: string;
  /** All active tag names as a comma-separated string (e.g. 'b,i') */
  tagNames: string;
  /** All active tag names as an array (e.g. ['b', 'i']) */
  tagNamesList: string[];
  /** Active block/container tag names for this run (e.g. ['div', 'p']) */
  containerTagNames: string[];
  /** CSS class string for inline tags (e.g. 'rtp-b rtp-i') */
  cssClass: string;
}

/**
 * A group of segments that share the same block/container context.
 * Produced by `groupSegments()`.
 */
export interface BlockGroup {
  /** Block tag names wrapping this group (e.g. ['ul', 'li']) */
  containerTagNames: string[];
  /** CSS classes for the block wrapper (e.g. 'rtp-ul rtp-li') */
  cssClass: string;
  /** The text segments inside this block */
  segments: TextSegment[];
}

/** Override default CSS for specific tags. Values are CSS property strings. */
export type RichTextOverrideStyles = Partial<{
  b: string;
  i: string;
  u: string;
  s: string;
  mark: string;
  small: string;
  sup: string;
  sub: string;
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  h5: string;
  h6: string;
  code: string;
  span: string;
  p: string;
  div: string;
  ul: string;
  ol: string;
  li: string;
  br: string;
  hr: string;
}>;

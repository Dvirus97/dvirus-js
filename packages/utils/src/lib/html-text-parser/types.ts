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
  /** CSS style string — only inline tag styles, excludes block/container styles */
  style: string;
  /** Style object — only inline tag styles, excludes block/container styles */
  styleObject?: Record<string, string>;
  /** Array of active block/container tag names (e.g. ['div', 'p']) */
  containerTagNames: string[];
  /** CSS class string for inline tags only (e.g. 'rtp-b rtp-i') */
  cssClass: string;
}

/**
 * A group of consecutive segments sharing the same block/container context.
 * Use `groupByBlocks()` to produce these from a flat `TextSegment[]`.
 */
export interface BlockGroup {
  /** Block/container tag names active for this group (e.g. ['div']) */
  containerTagNames: string[];
  /** CSS class string for block-level tags (e.g. 'rtp-div rtp-p') */
  cssClass: string;
  /** Inline CSS style string for block-level tags */
  style: string;
  /** Style object for block-level tags */
  styleObject: Record<string, string>;
  /** The text segments inside this block group */
  segments: TextSegment[];
}

import { setCssClassPrefix } from './constant';
import { appendToDom } from './dom-renderer';
import {
  generateStylesheet,
  getStylesheet,
  setOverrideStyles,
} from './stylesheet';
import { groupSegments, parseSegments } from './parsing';
import { removeBlockTag, setBlockTag, setSelfClosingTag, setTag } from './tags';
import { BlockGroup, TextSegment, RichTextOverrideStyles } from './types';

type _TextSegment = TextSegment;
type _BlockGroup = BlockGroup;
type _RichTextOverrideStyles = RichTextOverrideStyles;

export interface HtmlTextParser {
  /**
   * Parse an input string and append safe DOM nodes into the target element.
   * This avoids `innerHTML` and only creates known elements explicitly.
   */
  appendToDom: typeof appendToDom;
  /** Parse input into flat text segments with active tag context. */
  parseSegments: typeof parseSegments;
  /** Group flat segments by their active block/container tags. */
  groupSegments: typeof groupSegments;
  /** Register custom inline/block tags and optional style mappings. */
  setTag: typeof setTag;
  /** Register custom self-closing tags and optional style mappings. */
  setSelfClosingTag: typeof setSelfClosingTag;
  /** Mark a tag as block/container. */
  setBlockTag: typeof setBlockTag;
  /** Remove block/container behavior for a tag. */
  removeBlockTag: typeof removeBlockTag;
  /** Set the CSS class prefix used by generated classes (default: `rtp-`). */
  setCssClassPrefix: typeof setCssClassPrefix;
  /** Get the generated stylesheet content as a string. */
  getStylesheet: typeof getStylesheet;
  /** Inject or refresh the parser stylesheet in `document.head`. */
  generateStylesheet: typeof generateStylesheet;
  /** Override per-tag stylesheet fragments (merged with `!important`). */
  overrideStyles: typeof setOverrideStyles;
}

/**
 * Rich text parser toolkit.
 * Useful for dialog or toast content, or any time you want to allow rich text input without trusting raw HTML.
 *
 * Includes safe DOM rendering (`appendToDom`), parsing utilities,
 * tag registration, and stylesheet customization methods.
 */
export const htmlTextParser: HtmlTextParser = {
  appendToDom,
  parseSegments,
  groupSegments,
  setTag,
  setSelfClosingTag,
  setBlockTag,
  removeBlockTag,
  setCssClassPrefix,
  getStylesheet,
  generateStylesheet,
  overrideStyles: setOverrideStyles,
};

/**
 * Namespace-style type access for html-text-parser.
 *
 * @example
 * const segment: HtmlTextParser.TextSegment = {
 *   text: 'Hello',
 *   tagNames: '',
 *   tagNamesList: [],
 *   containerTagNames: [],
 *   cssClass: '',
 * };
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace HtmlTextParser {
  export type TextSegment = _TextSegment;
  export type BlockGroup = _BlockGroup;
  export type OverrideStyles = _RichTextOverrideStyles;
}

import { BLOCK_TAGS, getCssClassPrefix, SELF_CLOSING_TAGS } from './constant';
import { groupSegments, parseSegments } from './parsing';
import { BlockGroup, TextSegment } from './types';

// ─── Internal DOM types ───────────────────────────────────────────────────────

type DomNode = { appendChild: (child: unknown) => void };
type DomElement = DomNode & {
  className: string;
  setAttribute: (attr: string, value: string) => void;
};
type DomDocument = {
  createElement: (tagName: string) => DomElement;
  createTextNode: (text: string) => unknown;
};

// ─── Internal DOM builder ─────────────────────────────────────────────────────

function applyAttributes(element: DomElement, tag: string): void {
  element.className = `${getCssClassPrefix()}${tag}`;
}

function appendSegment(
  parent: DomNode,
  segment: TextSegment,
  doc: DomDocument,
): void {
  const inlineTags = segment.tagNamesList.filter((t) => !BLOCK_TAGS.has(t));
  const selfClosing = inlineTags.filter((t) => SELF_CLOSING_TAGS.has(t));
  const wrapping = inlineTags.filter((t) => !SELF_CLOSING_TAGS.has(t));

  // Build a chain of real elements for nested inline tags: <b><i>text</i></b>
  let current: DomNode = parent;
  for (const tag of wrapping) {
    const el = doc.createElement(tag);
    applyAttributes(el, tag);
    current.appendChild(el);
    current = el;
  }

  if (segment.text) {
    current.appendChild(doc.createTextNode(segment.text));
    return;
  }

  // Self-closing tags (e.g. <br/>, <hr/>) have no text
  for (const tag of selfClosing) {
    const el = doc.createElement(tag);
    applyAttributes(el, tag);
    current.appendChild(el);
  }
}

function appendGroups(
  root: DomNode,
  groups: BlockGroup[],
  doc: DomDocument,
): void {
  const openContainers: { tag: string; node: DomNode }[] = [];

  for (const group of groups) {
    const nextTags = group.containerTagNames;

    // Find the shared container prefix between currently open tags and next group.
    let commonPrefix = 0;
    while (
      commonPrefix < openContainers.length &&
      commonPrefix < nextTags.length &&
      openContainers[commonPrefix]?.tag === nextTags[commonPrefix]
    ) {
      commonPrefix++;
    }

    // Close containers that are no longer part of the next path.
    openContainers.length = commonPrefix;

    // Open only the new containers needed for this group.
    let parent: DomNode =
      openContainers[openContainers.length - 1]?.node ?? root;
    for (const tag of nextTags.slice(commonPrefix)) {
      const el = doc.createElement(tag);
      applyAttributes(el, tag);
      parent.appendChild(el);
      openContainers.push({ tag, node: el });
      parent = el;
    }

    const contentParent =
      openContainers[openContainers.length - 1]?.node ?? root;
    for (const segment of group.segments) {
      appendSegment(contentParent, segment, doc);
    }
  }
}

/**
 * Parses a rich-text string and appends the result as real DOM nodes.
 * This is a **safe alternative to `innerHTML`** — no HTML parsing happens in the browser.
 *
 * Supported tags: `<b>/<strong>`, `<i>/<em>`, `<u>`, `<s>`, `<mark>`, `<small>`,
 * `<sup>`, `<sub>`, `<h1>`–`<h6>`, `<code>`, `<span>`, `<p>`, `<div>`,
 * `<ul>`, `<ol>`, `<li>`, `<br/>`, `<hr/>`
 *
 * @example
 * // replaces: element.innerHTML = 'Hello <b>world</b>!';
 * htmlTextParser.appendToDom(element, 'Hello <b>world</b>!');
 *
 * @example
 * // Disable generated classes entirely
 * htmlTextParser.appendToDom(element, '<mark>highlight</mark>', { useClasses: false });
 */
export function appendToDom<T extends object>(
  htmlElement: T,
  input: string,
): void {
  if (!('document' in globalThis)) {
    console.warn('[html-text-parser] appendToDom: document is not available.');
    return;
  }

  if (!htmlElement || !('appendChild' in htmlElement)) {
    console.warn(
      '[html-text-parser] appendToDom: element does not support appendChild.',
    );
    return;
  }

  const doc = (globalThis as unknown as { document: DomDocument }).document;
  const groups = groupSegments(parseSegments(input));
  appendGroups(htmlElement as DomNode, groups, doc);
}

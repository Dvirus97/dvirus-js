import { getCssClassPrefix } from './constant';
import { RichTextOverrideStyles } from './types';

const STYLE_ELEMENT_ID = 'html-text-parser-styles';
const _overrideStyles: RichTextOverrideStyles = {};

function styles(prefix: string): string {
  const o = _overrideStyles;
  return `
    /* rtp = reach text parser */
    
    .${prefix}b {
        font-weight: bold;
        ${o.b ?? ''}
    }

    .${prefix}i {
        font-style: italic;
        ${o.i ?? ''}
    }

    .${prefix}u {
        text-decoration: underline;
        ${o.u ?? ''}
    }

    .${prefix}s {
        text-decoration: line-through;
        ${o.s ?? ''}
    }

    .${prefix}mark {
        background-color: yellow;
        ${o.mark ?? ''}
    }

    .${prefix}small {
        font-size: smaller;
        ${o.small ?? ''}
    }

    .${prefix}sup {
        vertical-align: super;
        font-size: smaller;
        ${o.sup ?? ''}
    }

    .${prefix}sub {
        vertical-align: sub;
        font-size: smaller;
        ${o.sub ?? ''}
    }

    .${prefix}h1 {
        font-size: 2em;
        font-weight: bold;
        display: block;
        ${o.h1 ?? ''}
    }

    .${prefix}h2 {
        font-size: 1.5em;
        font-weight: bold;
        display: block;
        ${o.h2 ?? ''}
    }

    .${prefix}h3 {
        font-size: 1.17em;
        font-weight: bold;
        display: block;
        ${o.h3 ?? ''}
    }

    .${prefix}h4 {
        font-size: 1em;
        font-weight: bold;
        display: block;
        ${o.h4 ?? ''}
    }

    .${prefix}h5 {
        font-size: 0.83em;
        font-weight: bold;
        display: block;
        ${o.h5 ?? ''}
    }

    .${prefix}h6 {
        font-size: 0.67em;
        font-weight: bold;
        display: block;
        ${o.h6 ?? ''}
    }

    .${prefix}code {
        font-family: monospace;
        ${o.code ?? ''}
    }

    .${prefix}span {
        ${o.span ?? ''}
    }

    .${prefix}p {
        margin-block: 1em;
        display: block;
        ${o.p ?? ''}
    }

    .${prefix}div {
        display: block;
        ${o.div ?? ''}
    }

    .${prefix}ul {
        padding-left: 1.5em;
        list-style: disc;
        display: block;
        ${o.ul ?? ''}
    }

    .${prefix}ol {
        padding-left: 1.5em;
        list-style: decimal;
        display: block;
        ${o.ol ?? ''}
    }

    .${prefix}li {
        margin-block: 0.5em;
        display: list-item;
        ${o.li ?? ''}
    }

    .${prefix}br {
        ${o.br ?? ''}
    }

    .${prefix}hr {
        ${o.hr ?? ''}
    }
  `;
}

/** Returns the full CSS stylesheet string for all registered tags. */
export function getStylesheet(): string {
  return styles(getCssClassPrefix());
}

/**
 * Injects (or refreshes) a `<style>` tag in the document `<head>`.
 * Safe to call multiple times — updates the existing tag if already present.
 */
export function generateStylesheet(): void {
  if (!('document' in globalThis)) {
    console.warn(
      '[html-text-parser] Cannot inject stylesheet: document is not available.',
    );
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _global = globalThis as any;
  const existing = _global.document.getElementById(STYLE_ELEMENT_ID);
  const content = styles(getCssClassPrefix());

  if (existing) {
    existing.textContent = content;
    return;
  }

  const tag = _global.document.createElement('style');
  tag.setAttribute('id', STYLE_ELEMENT_ID);
  tag.textContent = content;
  _global.document.head.appendChild(tag);
}

/**
 * Overrides default CSS for specific tags.
 * Values are CSS property strings, e.g. `"color: red; font-size: 1.2em;"`.
 * All overrides are automatically marked `!important`.
 * Calling this in a browser re-injects the stylesheet immediately.
 *
 * @example
 * setOverrideStyles({
 *   mark: 'background-color: pink; color: black;',
 *   code: 'font-family: "Fira Code", monospace;',
 * });
 */
export function setOverrideStyles(newStyles: RichTextOverrideStyles): void {
  Object.assign(
    _overrideStyles,
    Object.fromEntries(
      Object.entries(newStyles).map(([k, v]) => [
        k,
        (v as string).replace(/;/g, ' !important;'),
      ]),
    ),
  );
  if ('document' in globalThis) {
    generateStylesheet();
  }
}

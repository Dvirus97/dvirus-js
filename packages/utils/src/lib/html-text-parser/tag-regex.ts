import { RICH_TEXT_TAGS, SELF_CLOSING_TAGS } from './constant';

export const getTagNames = (): string => [...RICH_TEXT_TAGS.keys()].join('|');

export const getSelfClosingTagNames = (): string =>
  [...SELF_CLOSING_TAGS.keys()].join('|');

export const getTagRegex = (): RegExp =>
  new RegExp(
    `<\\/?(${getTagNames()})>|<(${getSelfClosingTagNames()})\\s*/?>`,
    'gi',
  );

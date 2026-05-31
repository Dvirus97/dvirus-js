import { BLOCK_TAGS, getCssClassPrefix } from './constant';
import { TextSegment } from './types';

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
    containerTagNames: containerTags,
    cssClass: inlineTags.map((t) => `${getCssClassPrefix()}${t}`).join(' '),
  };
};

import { getCssClassPrefix } from './constant';
import { BlockGroup, TextSegment } from './types';

export function groupSegments(segments: TextSegment[]): BlockGroup[] {
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
        segments: [],
      };
      groups.push(current);
    }

    (current as BlockGroup).segments.push(segment);
  }

  return groups;
}

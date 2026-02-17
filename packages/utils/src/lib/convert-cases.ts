/**
 * Normalizes any string to lowercase with spaces
 * Handles various cases like special characters, extra spaces, and different formats
 * @param input - The string to normalize
 * @returns A normalized string in lowercase with single spaces
 */
export function normalizeString(input: string): string {
  return (
    input
      // Insert a space before all caps that are followed by lowercase (for PascalCase and camelCase)
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      // Insert a space between two capitals when the second is followed by a lowercase (e.g. "HTMLParser" -> "HTML Parser")
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      // Convert to lowercase
      .toLowerCase()
      // Replace underscores, hyphens, and other common separators with spaces
      .replace(/[_-]+/g, ' ')
      // Replace multiple consecutive spaces with single space
      .replace(/\s+/g, ' ')
      // Remove leading and trailing whitespace
      .trim()
  );
}

/**
 * Converts a string to various cases
 * @param input - The string to convert
 * @param caseType - The target case type
 * @returns The string converted to the specified case
 */

export type CaseType =
  | 'lowercase'
  | 'UPPERCASE'
  | 'Title Case'
  | 'kebab-case'
  | 'snake_case'
  | 'camelCase'
  | 'PascalCase'
  | 'dot.case'
  | 'path/case'
  | 'Sentence case'
  | 'Header-Case'
  | 'reverse';

// Overload convertCase to accept the new types
export function convertCase(input: string, caseType: CaseType): string;

export function convertCase(input: string, caseType: CaseType): string {
  // First normalize the string to lowercase with spaces
  const normalized = normalizeString(input);

  switch (caseType) {
    case 'lowercase':
      return normalized.toLowerCase();

    case 'UPPERCASE':
      return normalized.toUpperCase();

    case 'Title Case':
      return normalized
        .split(' ')
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(' ');

    case 'kebab-case':
      return normalized.replace(/\s+/g, '-');

    case 'snake_case':
      return normalized.replace(/\s+/g, '_');

    case 'camelCase': {
      const words = normalized.split(' ');
      if (words.length === 0) return '';
      return (
        words[0].toLowerCase() +
        words
          .slice(1)
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join('')
      );
    }

    case 'PascalCase':
      return normalized
        .split(' ')
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join('');

    case 'dot.case':
      return normalized.replace(/\s+/g, '.');

    case 'path/case':
      return normalized.replace(/\s+/g, '/');

    case 'Sentence case':
      // Capitalize the first letter of each sentence and standalone "i"
      return normalized
        .replace(/(^\s*\w|[.!?]\s*\w)/g, (match) => match.toUpperCase())
        .replace(/\bi\b/g, 'I');

    case 'Header-Case':
      return normalized
        .split(' ')
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join('-');

    case 'reverse':
      return normalized.split('').reverse().join('');

    default:
      throw new Error(`Unsupported case type: ${caseType}`);
  }
}

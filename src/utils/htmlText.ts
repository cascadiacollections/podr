/**
 * Text of an HTML fragment, without building a document.
 *
 * `toPlainText` uses this for ordinary show notes. It returns null when the
 * fragment needs the HTML parser's tree rules (script and style move into
 * head, svg is foreign content, an entity is not in the small table below).
 * The caller then uses DOMParser, so the text stays the same.
 *
 * DOMParser runs with scripting disabled. `<noscript>` is therefore ordinary
 * markup and its text is kept. Script, style, title and template elements are
 * not in the body, so their contents must not be emitted; those tags refuse
 * the scan instead of guessing.
 */

const RAW_TAGS = new Set([
  'script',
  'style',
  'title',
  'template',
  'textarea',
  'xmp',
  'iframe',
  'noembed',
  'noframes',
  'plaintext',
  'svg',
  'math',
]);

/**
 * Named character references this scan will decode. Anything else, including a
 * name that is only a prefix of a real reference (`&ampere;`), refuses the
 * scan so the HTML parser can apply the longest-match rule.
 * Keys are the exact HTML names (`&AMP;` is an entity, `&NBSP;` is not).
 */
const NAMED: Record<string, string> = Object.assign(Object.create(null) as Record<string, string>, {
  amp: '&',
  AMP: '&',
  lt: '<',
  LT: '<',
  gt: '>',
  GT: '>',
  quot: '"',
  QUOT: '"',
  apos: "'",
  nbsp: '\u00A0',
  hellip: '\u2026',
  mdash: '\u2014',
  ndash: '\u2013',
  rsquo: '\u2019',
  lsquo: '\u2018',
  rdquo: '\u201D',
  ldquo: '\u201C',
  sbquo: '\u201A',
  bdquo: '\u201E',
  bull: '\u2022',
  middot: '\u00B7',
  copy: '\u00A9',
  reg: '\u00AE',
  trade: '\u2122',
  deg: '\u00B0',
  times: '\u00D7',
  divide: '\u00F7',
  euro: '\u20AC',
  pound: '\u00A3',
  yen: '\u00A5',
  cent: '\u00A2',
  sect: '\u00A7',
  para: '\u00B6',
  laquo: '\u00AB',
  raquo: '\u00BB',
  shy: '\u00AD',
  thinsp: '\u2009',
  ensp: '\u2002',
  emsp: '\u2003',
  zwnj: '\u200C',
  zwj: '\u200D',
  lrm: '\u200E',
  rlm: '\u200F',
  dagger: '\u2020',
  Dagger: '\u2021',
  permil: '\u2030',
  lsaquo: '\u2039',
  rsaquo: '\u203A',
  frasl: '\u2044',
  minus: '\u2212',
  prime: '\u2032',
  Prime: '\u2033',
  not: '\u00AC',
  plusmn: '\u00B1',
  micro: '\u00B5',
  iexcl: '\u00A1',
  iquest: '\u00BF',
  brvbar: '\u00A6',
  curren: '\u00A4',
  uml: '\u00A8',
  acute: '\u00B4',
  cedil: '\u00B8',
  macr: '\u00AF',
  sup1: '\u00B9',
  sup2: '\u00B2',
  sup3: '\u00B3',
  ordm: '\u00BA',
  ordf: '\u00AA',
  frac14: '\u00BC',
  frac12: '\u00BD',
  frac34: '\u00BE',
  Agrave: '\u00C0',
  Aacute: '\u00C1',
  Acirc: '\u00C2',
  Atilde: '\u00C3',
  Auml: '\u00C4',
  Aring: '\u00C5',
  AElig: '\u00C6',
  Ccedil: '\u00C7',
  Egrave: '\u00C8',
  Eacute: '\u00C9',
  Ecirc: '\u00CA',
  Euml: '\u00CB',
  Igrave: '\u00CC',
  Iacute: '\u00CD',
  Icirc: '\u00CE',
  Iuml: '\u00CF',
  ETH: '\u00D0',
  Ntilde: '\u00D1',
  Ograve: '\u00D2',
  Oacute: '\u00D3',
  Ocirc: '\u00D4',
  Otilde: '\u00D5',
  Ouml: '\u00D6',
  Oslash: '\u00D8',
  Ugrave: '\u00D9',
  Uacute: '\u00DA',
  Ucirc: '\u00DB',
  Uuml: '\u00DC',
  Yacute: '\u00DD',
  THORN: '\u00DE',
  szlig: '\u00DF',
  agrave: '\u00E0',
  aacute: '\u00E1',
  acirc: '\u00E2',
  atilde: '\u00E3',
  auml: '\u00E4',
  aring: '\u00E5',
  aelig: '\u00E6',
  ccedil: '\u00E7',
  egrave: '\u00E8',
  eacute: '\u00E9',
  ecirc: '\u00EA',
  euml: '\u00EB',
  igrave: '\u00EC',
  iacute: '\u00ED',
  icirc: '\u00EE',
  iuml: '\u00EF',
  eth: '\u00F0',
  ntilde: '\u00F1',
  ograve: '\u00F2',
  oacute: '\u00F3',
  ocirc: '\u00F4',
  otilde: '\u00F5',
  ouml: '\u00F6',
  oslash: '\u00F8',
  ugrave: '\u00F9',
  uacute: '\u00FA',
  ucirc: '\u00FB',
  uuml: '\u00FC',
  yacute: '\u00FD',
  thorn: '\u00FE',
  yuml: '\u00FF',
});

/** HTML numeric references in 0x80–0x9F decode as Windows-1252, not as controls. */
const WINDOWS_1252 = new Map<number, string>([
  [0x80, '\u20AC'],
  [0x82, '\u201A'],
  [0x83, '\u0192'],
  [0x84, '\u201E'],
  [0x85, '\u2026'],
  [0x86, '\u2020'],
  [0x87, '\u2021'],
  [0x88, '\u02C6'],
  [0x89, '\u2030'],
  [0x8a, '\u0160'],
  [0x8b, '\u2039'],
  [0x8c, '\u0152'],
  [0x8e, '\u017D'],
  [0x91, '\u2018'],
  [0x92, '\u2019'],
  [0x93, '\u201C'],
  [0x94, '\u201D'],
  [0x95, '\u2022'],
  [0x96, '\u2013'],
  [0x97, '\u2014'],
  [0x98, '\u02DC'],
  [0x99, '\u2122'],
  [0x9a, '\u0161'],
  [0x9b, '\u203A'],
  [0x9c, '\u0153'],
  [0x9e, '\u017E'],
  [0x9f, '\u0178'],
]);

const REPLACEMENT = '\uFFFD';

function isAlpha(char: string): boolean {
  return (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z');
}

function isNameChar(char: string): boolean {
  return isAlpha(char) || (char >= '0' && char <= '9') || char === '-';
}

function isSpace(char: string): boolean {
  return char === ' ' || char === '\n' || char === '\r' || char === '\t' || char === '\f';
}

function isDigit(char: string): boolean {
  return char >= '0' && char <= '9';
}

function isHex(char: string): boolean {
  return isDigit(char) || (char >= 'a' && char <= 'f') || (char >= 'A' && char <= 'F');
}

function decodeCodePoint(codePoint: number): string {
  if (codePoint === 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
    return REPLACEMENT;
  }

  return WINDOWS_1252.get(codePoint) ?? String.fromCodePoint(codePoint);
}

interface IAdvance {
  readonly text: string;
  readonly next: number;
}

/**
 * Decodes one character reference at `index`, which points at `&`.
 * Returns null when the reference is not one this scan knows completely.
 */
function readReference(value: string, index: number): IAdvance | null {
  const next = value[index + 1];

  if (!next || (next !== '#' && !isAlpha(next))) {
    return { text: '&', next: index + 1 };
  }

  if (next === '#') {
    let cursor = index + 2;
    let hex = false;

    if (value[cursor] === 'x' || value[cursor] === 'X') {
      hex = true;
      cursor += 1;
    }

    const digitsStart = cursor;
    let codePoint = 0;
    const base = hex ? 16 : 10;

    while (cursor < value.length && (hex ? isHex(value[cursor]) : isDigit(value[cursor]))) {
      const char = value[cursor];
      const digit = isDigit(char) ? char.charCodeAt(0) - 48 : char.toLowerCase().charCodeAt(0) - 87;
      codePoint = codePoint * base + digit;

      if (codePoint > 0x10ffff) {
        codePoint = 0x110000;
      }

      cursor += 1;
    }

    // A numeric reference without a semicolon, or with no digits, is left to
    // the HTML parser. `&amp` without `;` is too: it still decodes.
    if (cursor === digitsStart || value[cursor] !== ';') {
      return null;
    }

    return { text: decodeCodePoint(codePoint), next: cursor + 1 };
  }

  let cursor = index + 1;

  while (cursor < value.length && (isAlpha(value[cursor]) || isDigit(value[cursor]))) {
    cursor += 1;
  }

  if (value[cursor] !== ';') {
    return null;
  }

  const name = value.slice(index + 1, cursor);
  const text = NAMED[name];

  if (text === undefined) {
    return null;
  }

  return { text, next: cursor + 1 };
}

/**
 * Index just after the tag that starts at `index`, or null to refuse the fragment.
 */
function skipTag(value: string, index: number): number | null {
  const length = value.length;
  let cursor = index + 1;

  if (value[cursor] === '/') {
    cursor += 1;
  }

  const nameStart = cursor;

  while (cursor < length && isNameChar(value[cursor])) {
    cursor += 1;
  }

  if (cursor === nameStart) {
    return null;
  }

  const name = value.slice(nameStart, cursor).toLowerCase();

  if (RAW_TAGS.has(name)) {
    return null;
  }

  if (
    cursor < length &&
    !isSpace(value[cursor]) &&
    value[cursor] !== '/' &&
    value[cursor] !== '>'
  ) {
    return null;
  }

  while (cursor < length) {
    while (cursor < length && isSpace(value[cursor])) {
      cursor += 1;
    }

    if (cursor >= length) {
      return null;
    }

    if (value[cursor] === '>') {
      return cursor + 1;
    }

    if (value[cursor] === '/') {
      cursor += 1;

      while (cursor < length && isSpace(value[cursor])) {
        cursor += 1;
      }

      if (value[cursor] === '>') {
        return cursor + 1;
      }

      return null;
    }

    const attributeStart = cursor;

    while (
      cursor < length &&
      !isSpace(value[cursor]) &&
      value[cursor] !== '=' &&
      value[cursor] !== '>' &&
      value[cursor] !== '/' &&
      value[cursor] !== '<' &&
      value[cursor] !== '"' &&
      value[cursor] !== "'"
    ) {
      cursor += 1;
    }

    if (cursor === attributeStart) {
      return null;
    }

    while (cursor < length && isSpace(value[cursor])) {
      cursor += 1;
    }

    if (value[cursor] !== '=') {
      continue;
    }

    cursor += 1;

    while (cursor < length && isSpace(value[cursor])) {
      cursor += 1;
    }

    const quote = value[cursor];

    if (quote === '"' || quote === "'") {
      const end = value.indexOf(quote, cursor + 1);

      if (end < 0) {
        return null;
      }

      cursor = end + 1;
      continue;
    }

    if (cursor >= length) {
      return null;
    }

    while (cursor < length && !isSpace(value[cursor]) && value[cursor] !== '>') {
      if (value[cursor] === '<' || value[cursor] === '"' || value[cursor] === "'") {
        return null;
      }

      cursor += 1;
    }
  }

  return null;
}

/**
 * The text a document's body would expose for ordinary markup.
 * Null means the fragment is outside what this scan claims, not that it failed.
 * @param value - HTML, already adjusted for block boundaries when the caller does that
 * @returns The text content, or null when DOMParser should read it instead
 */
export function readHtmlText(value: string): string | null {
  if (value.includes('\0')) {
    return null;
  }

  const parts: string[] = [];
  const length = value.length;
  let index = 0;
  let textStart = 0;

  while (index < length) {
    const tagAt = value.indexOf('<', index);
    const referenceAt = value.indexOf('&', index);
    let next = -1;
    let isTag = false;

    if (tagAt !== -1 && (referenceAt === -1 || tagAt < referenceAt)) {
      next = tagAt;
      isTag = true;
    } else if (referenceAt !== -1) {
      next = referenceAt;
    } else {
      break;
    }

    if (!isTag) {
      const reference = readReference(value, next);

      if (!reference) {
        return null;
      }

      if (next > textStart) {
        parts.push(value.slice(textStart, next));
      }

      parts.push(reference.text);
      index = reference.next;
      textStart = index;
      continue;
    }

    const marker = value[next + 1];

    if (marker === '!' || marker === '?') {
      if (value.startsWith('<!--', next)) {
        const end = value.indexOf('-->', next + 4);

        if (end < 0) {
          return null;
        }

        if (next > textStart) {
          parts.push(value.slice(textStart, next));
        }

        index = end + 3;
        textStart = index;
        continue;
      }

      return null;
    }

    if (marker === '/' || isAlpha(marker)) {
      const after = skipTag(value, next);

      if (after === null) {
        return null;
      }

      if (next > textStart) {
        parts.push(value.slice(textStart, next));
      }

      index = after;
      textStart = index;
      continue;
    }

    // `<3` and `< ` are text. The `<` stays in the current run.
    index = next + 1;
  }

  if (textStart < length) {
    parts.push(value.slice(textStart));
  }

  return parts.join('');
}

export type DocumentBlock =
  | { type: "paragraph"; lines: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "section"; label: string; blocks: DocumentBlock[] };

// Only a single Latin letter marks a real multi-passage section (統合理解 "【A】"/"【B】").
// A longer bracketed label like "【申込、受付について】" is just a heading, not a passage split.
// The marker is only ever separated from its own first paragraph by a single \n (not a
// blank line), so it ends up as the PREFIX of a chunk rather than a chunk on its own —
// match the prefix and keep whatever text follows it on the same chunk.
const SECTION_MARKER_PREFIX_RE = /^【([A-Z])】\n?([\s\S]*)$/;

// Block-level structure on top of the inline markup parser (parseJapaneseMarkup):
// paragraphs (split on blank lines / single line breaks), markdown-style tables,
// and 【A】/【B】-style multi-passage sections. See docs/text-parser.md.
export function parseJapaneseDocument(text: string): DocumentBlock[] {
  const chunks = text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const markers = chunks.reduce<{ index: number; label: string; remainder: string }[]>(
    (acc, chunk, index) => {
      const match = chunk.match(SECTION_MARKER_PREFIX_RE);
      if (match) acc.push({ index, label: match[1], remainder: match[2].trim() });
      return acc;
    },
    [],
  );

  if (markers.length === 0) {
    return chunks.flatMap(parseChunk);
  }

  const blocks: DocumentBlock[] = [];

  const preamble = chunks.slice(0, markers[0].index);
  blocks.push(...preamble.flatMap(parseChunk));

  markers.forEach((marker, i) => {
    const nextIndex = i + 1 < markers.length ? markers[i + 1].index : chunks.length;
    const trailingChunks = chunks.slice(marker.index + 1, nextIndex);
    const sectionChunks = marker.remainder ? [marker.remainder, ...trailingChunks] : trailingChunks;
    blocks.push({
      type: "section",
      label: marker.label,
      blocks: sectionChunks.flatMap(parseChunk),
    });
  });

  return blocks;
}

function isTableRowLine(line: string): boolean {
  return line.trim().startsWith("|");
}

function isTableSeparatorLine(line: string): boolean {
  return /^\|?[\s:|-]+\|?$/.test(line.trim());
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

// A chunk (one blank-line-separated section of storyText) can mix a heading
// line and a table with only a single \n between them (real bank-soal text
// does this, e.g. "頑丈で安全性の高いフレームタイプ\n| ご旅行期間 | ... |"), so
// tables are detected per-line within a chunk, not by checking if the whole
// chunk starts with "|" — otherwise the heading pulls the whole chunk down
// to a plain paragraph and the table never renders as a table.
function parseChunk(chunk: string): DocumentBlock[] {
  const lines = chunk.split("\n").filter((line) => line.trim() !== "");
  const blocks: DocumentBlock[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      blocks.push({ type: "paragraph", lines: paragraphLines });
      paragraphLines = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const isTableStart =
      isTableRowLine(lines[i]) && i + 1 < lines.length && isTableSeparatorLine(lines[i + 1]);

    if (isTableStart) {
      flushParagraph();
      const headers = parseTableRow(lines[i]);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRowLine(lines[i])) {
        rows.push(parseTableRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    paragraphLines.push(lines[i]);
    i += 1;
  }

  flushParagraph();
  return blocks;
}

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
    return chunks.map(parseChunk);
  }

  const blocks: DocumentBlock[] = [];

  const preamble = chunks.slice(0, markers[0].index);
  blocks.push(...preamble.map(parseChunk));

  markers.forEach((marker, i) => {
    const nextIndex = i + 1 < markers.length ? markers[i + 1].index : chunks.length;
    const trailingChunks = chunks.slice(marker.index + 1, nextIndex);
    const sectionChunks = marker.remainder ? [marker.remainder, ...trailingChunks] : trailingChunks;
    blocks.push({
      type: "section",
      label: marker.label,
      blocks: sectionChunks.map(parseChunk),
    });
  });

  return blocks;
}

function parseChunk(chunk: string): DocumentBlock {
  return isTableChunk(chunk) ? parseTableChunk(chunk) : { type: "paragraph", lines: chunk.split("\n") };
}

function isTableChunk(chunk: string): boolean {
  const lines = chunk.split("\n").filter(Boolean);
  return lines.length >= 2 && lines[0].trim().startsWith("|") && /^\|?[\s:|-]+\|?$/.test(lines[1].trim());
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function parseTableChunk(chunk: string): DocumentBlock {
  const lines = chunk.split("\n").filter(Boolean);
  return {
    type: "table",
    headers: parseTableRow(lines[0]),
    rows: lines.slice(2).map(parseTableRow),
  };
}

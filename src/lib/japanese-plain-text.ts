import { parseJapaneseMarkup, type MarkupSegment } from "./japanese-markup";
import { parseJapaneseDocument, type DocumentBlock } from "./japanese-document";

// Plain-text export for the "copy question" feature (paste into an AI chat).
// Furigana is dropped down to just the kanji (no reading) — for
// MOJI_GOI_READ_KANJI questions the reading IS the answer, so keeping it would
// leak it into the clipboard regardless of whether it's visually hidden.
// Underline becomes **text** (markdown emphasis, universally read by AI chat
// contexts), slots become blanks.
function segmentsToPlainText(segments: MarkupSegment[]): string {
  return segments
    .map((segment) => {
      switch (segment.type) {
        case "text":
          return segment.value;
        case "furigana":
          return segment.kanji;
        case "underline":
          return `**${segmentsToPlainText(segment.children)}**`;
        case "slot":
          return segment.kind === "star" ? "★" : "___";
      }
    })
    .join("");
}

export function markupToPlainText(text: string): string {
  return segmentsToPlainText(parseJapaneseMarkup(text));
}

function blocksToPlainText(blocks: DocumentBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "paragraph") {
        return block.lines.map(markupToPlainText).join("\n");
      }
      if (block.type === "table") {
        const headerLine = block.headers.map(markupToPlainText).join(" | ");
        const rowLines = block.rows.map((row) => row.map(markupToPlainText).join(" | "));
        return [headerLine, ...rowLines].join("\n");
      }
      return `[${block.label}]\n${blocksToPlainText(block.blocks)}`;
    })
    .join("\n\n");
}

export function documentToPlainText(text: string): string {
  return blocksToPlainText(parseJapaneseDocument(text));
}

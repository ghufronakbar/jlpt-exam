import type { ReactNode } from "react";
import { parseJapaneseDocument, type DocumentBlock } from "@/lib/japanese-document";
import { renderInlineJapanese } from "@/components/japanese-text";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function renderBlock(block: DocumentBlock, key: React.Key): ReactNode {
  switch (block.type) {
    case "paragraph":
      // Real dokkai passages mostly separate paragraphs with a single \n (not a
      // blank line), so each line gets full paragraph-like spacing (not a plain
      // <br/>) — otherwise a new paragraph is invisible when the previous line
      // happens to fill the container width.
      return (
        <div key={key} className="mb-3 last:mb-0">
          {block.lines.map((line, lineIndex) => (
            <div key={lineIndex} className={lineIndex > 0 ? "mt-3" : undefined}>
              {renderInlineJapanese(line)}
            </div>
          ))}
        </div>
      );

    case "table":
      return (
        <Table key={key} className="mb-3 last:mb-0">
          <TableHeader>
            <TableRow>
              {block.headers.map((header, index) => (
                <TableHead key={index} className="whitespace-normal">
                  {renderInlineJapanese(header)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {block.rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex} className="whitespace-normal">
                    {renderInlineJapanese(cell)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );

    case "section":
      return (
        <div key={key} className="rounded-lg border p-3">
          <span className="mb-2 inline-block rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">
            {block.label}
          </span>
          {block.blocks.map((child, index) => renderBlock(child, index))}
        </div>
      );
  }
}

// Groups adjacent "section" blocks (【A】/【B】) into a side-by-side grid; everything
// else renders in normal document flow. See docs/text-parser.md for the design.
function renderTopLevel(blocks: DocumentBlock[]): ReactNode[] {
  const output: ReactNode[] = [];
  let sectionGroup: Extract<DocumentBlock, { type: "section" }>[] = [];

  const flushSectionGroup = (key: string) => {
    if (sectionGroup.length === 0) return;
    output.push(
      <div key={key} className="mb-3 grid gap-3 last:mb-0 sm:grid-cols-2">
        {sectionGroup.map((section, index) => renderBlock(section, index))}
      </div>,
    );
    sectionGroup = [];
  };

  blocks.forEach((block, index) => {
    if (block.type === "section") {
      sectionGroup.push(block);
      return;
    }
    flushSectionGroup(`section-group-${index}`);
    output.push(renderBlock(block, index));
  });
  flushSectionGroup("section-group-end");

  return output;
}

// For QuestionContext.storyText (bacaan panjang) — handles paragraphs, line breaks,
// markdown-style tables, and 【A】/【B】 multi-passage sections. Use <JapaneseText> instead
// for single-line content (questionText/answerText/instruction never need this).
export function JapanesePassage({ text, className }: { text: string; className?: string }) {
  const blocks = parseJapaneseDocument(text);
  return <div className={className}>{renderTopLevel(blocks)}</div>;
}

import { Fragment, type ReactNode } from "react";
import { parseJapaneseMarkup, type MarkupSegment } from "@/lib/japanese-markup";

function renderSegments(
  segments: MarkupSegment[],
  opts: { hideFuriganaInUnderline: boolean; insideUnderline: boolean },
): ReactNode {
  return segments.map((segment, index) => {
    switch (segment.type) {
      case "text":
        return <Fragment key={index}>{segment.value}</Fragment>;

      case "furigana":
        // MOJI_GOI_READ_KANJI: furigana inside __underline__ is the answer itself
        // and must stay hidden while the question is being worked on.
        if (opts.insideUnderline && opts.hideFuriganaInUnderline) {
          return <Fragment key={index}>{segment.kanji}</Fragment>;
        }
        return (
          <ruby key={index}>
            {segment.kanji}
            <rt>{segment.reading}</rt>
          </ruby>
        );

      case "underline":
        return (
          <span key={index} className="underline underline-offset-4">
            {renderSegments(segment.children, { ...opts, insideUnderline: true })}
          </span>
        );

      case "slot":
        return (
          <span
            key={index}
            className="mx-1 inline-block min-w-12 border-b border-foreground text-center"
          >
            {segment.kind === "star" ? "★" : " "}
          </span>
        );
    }
  });
}

// Shared with JapanesePassage (japanese-passage.tsx), which renders one line/cell at a time.
export function renderInlineJapanese(text: string, hideFuriganaInUnderline = false): ReactNode {
  const segments = parseJapaneseMarkup(text);
  return renderSegments(segments, { hideFuriganaInUnderline, insideUnderline: false });
}

export function JapaneseText({
  text,
  hideFuriganaInUnderline = false,
  className,
}: {
  text: string;
  hideFuriganaInUnderline?: boolean;
  className?: string;
}) {
  return <span className={className}>{renderInlineJapanese(text, hideFuriganaInUnderline)}</span>;
}

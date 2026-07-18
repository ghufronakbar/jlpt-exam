import { Fragment } from "react";
import type { JlptScoreProjection } from "@/lib/jlpt-score";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const WEAK_THRESHOLD = 60;

// Kolom "Skor"/"Skor Berbobot" hanya terisi di baris subtotal & total — skor
// skala-60 memang milik scoring section, bukan milik satu mondai.
export function JlptScoreTable({ projection }: { projection: JlptScoreProjection }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="whitespace-normal">Mondai</TableHead>
          <TableHead className="text-right">Bobot</TableHead>
          <TableHead className="text-right">Benar</TableHead>
          <TableHead className="text-right">Akurasi</TableHead>
          <TableHead className="text-right">Skor</TableHead>
          <TableHead className="text-right">Skor Berbobot</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projection.sections.map((section) => (
          <Fragment key={section.key}>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableCell colSpan={6} className="whitespace-normal font-semibold">
                {section.label}
              </TableCell>
            </TableRow>
            {section.rows.map((row) => (
              <TableRow key={row.mondaiType}>
                <TableCell className="whitespace-normal pl-6">{row.label}</TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  ×{row.weight.toFixed(1)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.correct}/{row.total}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    row.accuracy < WEAK_THRESHOLD && "text-destructive",
                  )}
                >
                  {row.accuracy}%
                </TableCell>
                <TableCell />
                <TableCell />
              </TableRow>
            ))}
            <TableRow className="font-medium">
              <TableCell className="pl-6 text-muted-foreground">Subtotal</TableCell>
              <TableCell />
              <TableCell className="text-right tabular-nums">
                {section.correct}/{section.total}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums",
                  section.accuracy < WEAK_THRESHOLD && "text-destructive",
                )}
              >
                {section.accuracy}%
              </TableCell>
              <TableCell className="text-right tabular-nums">{section.plainScore} / 60</TableCell>
              <TableCell className="text-right tabular-nums">
                {section.weightedScore} / 60
              </TableCell>
            </TableRow>
          </Fragment>
        ))}
        <TableRow className="border-t-2 font-semibold">
          <TableCell>Total</TableCell>
          <TableCell />
          <TableCell className="text-right tabular-nums">
            {projection.correct}/{projection.total}
          </TableCell>
          <TableCell className="text-right tabular-nums">{projection.accuracy}%</TableCell>
          <TableCell className="text-right tabular-nums">
            {projection.plainScore} / {projection.maxScore}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {projection.weightedScore} / {projection.maxScore}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

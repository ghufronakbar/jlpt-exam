"use client";

import Link from "next/link";
import type { JlptLevel, MondaiType } from "@prisma/client";
import type { ScoringSectionKey } from "@/lib/jlpt-score";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const SECTION_COLUMNS: { key: ScoringSectionKey; label: string }[] = [
  { key: "GENGO_CHISHIKI", label: "言語知識" },
  { key: "DOKKAI", label: "読解" },
  { key: "CHOUKAI", label: "聴解" },
];

export type ProgressTableRow = {
  attemptId: number;
  packageName: string;
  dateLabel: string;
  mondaiAccuracy: Partial<Record<MondaiType, number>>;
  sections: Record<
    ScoringSectionKey,
    { plainScore: number; weightedScore: number; accuracy: number } | null
  >;
  totalPlain: number;
  totalWeighted: number;
  totalMax: number;
  totalAccuracy: number;
};

export type ProgressLevelView = {
  level: JlptLevel;
  mondaiColumns: { mondaiType: MondaiType; label: string }[];
  rows: ProgressTableRow[];
};

function accuracyClass(accuracy: number) {
  return accuracy < WEAK_THRESHOLD ? "text-destructive" : undefined;
}

function LevelTable({ view }: { view: ProgressLevelView }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead rowSpan={2} className="whitespace-normal align-bottom">
            Paket
          </TableHead>
          <TableHead rowSpan={2} className="align-bottom">
            Tanggal
          </TableHead>
          <TableHead colSpan={view.mondaiColumns.length} className="border-l text-center">
            Akurasi per Mondai
          </TableHead>
          <TableHead colSpan={SECTION_COLUMNS.length} className="border-l text-center">
            Skor per Section
          </TableHead>
          <TableHead colSpan={SECTION_COLUMNS.length} className="border-l text-center">
            Skor Berbobot
          </TableHead>
          <TableHead colSpan={2} className="border-l text-center">
            Total
          </TableHead>
        </TableRow>
        <TableRow>
          {view.mondaiColumns.map((column, index) => (
            <TableHead
              key={column.mondaiType}
              className={cn("text-right", index === 0 && "border-l")}
            >
              {column.label}
            </TableHead>
          ))}
          {SECTION_COLUMNS.map((column, index) => (
            <TableHead
              key={`plain-${column.key}`}
              className={cn("text-right", index === 0 && "border-l")}
            >
              {column.label}
            </TableHead>
          ))}
          {SECTION_COLUMNS.map((column, index) => (
            <TableHead
              key={`weighted-${column.key}`}
              className={cn("text-right", index === 0 && "border-l")}
            >
              {column.label}
            </TableHead>
          ))}
          <TableHead className="border-l text-right">Skor</TableHead>
          <TableHead className="text-right">Berbobot</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {view.rows.map((row) => (
          <TableRow key={row.attemptId}>
            <TableCell className="whitespace-normal">
              <Link
                href={`/result/${row.attemptId}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {row.packageName}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">{row.dateLabel}</TableCell>
            {view.mondaiColumns.map((column, index) => {
              const accuracy = row.mondaiAccuracy[column.mondaiType];
              return (
                <TableCell
                  key={column.mondaiType}
                  className={cn(
                    "text-right tabular-nums",
                    index === 0 && "border-l",
                    accuracy !== undefined && accuracyClass(accuracy),
                  )}
                >
                  {accuracy !== undefined ? `${accuracy}%` : "–"}
                </TableCell>
              );
            })}
            {SECTION_COLUMNS.map((column, index) => {
              const section = row.sections[column.key];
              return (
                <TableCell
                  key={`plain-${column.key}`}
                  className={cn("text-right tabular-nums", index === 0 && "border-l")}
                >
                  {section ? (
                    <>
                      {section.plainScore}/60{" "}
                      <span className={cn("text-muted-foreground", accuracyClass(section.accuracy))}>
                        ({section.accuracy}%)
                      </span>
                    </>
                  ) : (
                    "–"
                  )}
                </TableCell>
              );
            })}
            {SECTION_COLUMNS.map((column, index) => {
              const section = row.sections[column.key];
              return (
                <TableCell
                  key={`weighted-${column.key}`}
                  className={cn("text-right tabular-nums", index === 0 && "border-l")}
                >
                  {section ? `${section.weightedScore}/60` : "–"}
                </TableCell>
              );
            })}
            <TableCell className="border-l text-right font-medium tabular-nums">
              {row.totalPlain}/{row.totalMax}{" "}
              <span className={cn("font-normal text-muted-foreground", accuracyClass(row.totalAccuracy))}>
                ({row.totalAccuracy}%)
              </span>
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {row.totalWeighted}/{row.totalMax}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ProgressTabs({ levels }: { levels: ProgressLevelView[] }) {
  return (
    <Tabs defaultValue={levels[0].level}>
      <TabsList>
        {levels.map((view) => (
          <TabsTrigger key={view.level} value={view.level}>
            {view.level}
          </TabsTrigger>
        ))}
      </TabsList>
      {levels.map((view) => (
        <TabsContent key={view.level} value={view.level}>
          <LevelTable view={view} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

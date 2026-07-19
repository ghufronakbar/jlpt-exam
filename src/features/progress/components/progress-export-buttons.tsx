"use client";

import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportProgressToExcel, exportProgressToPdf } from "../lib/export";
import type { ProgressLevelView } from "./progress-tabs";

export function ProgressExportButtons({ view }: { view: ProgressLevelView }) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => exportProgressToExcel(view)}
      >
        <FileSpreadsheet className="size-4" />
        Export Excel
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => exportProgressToPdf(view)}>
        <FileText className="size-4" />
        Export PDF
      </Button>
    </div>
  );
}

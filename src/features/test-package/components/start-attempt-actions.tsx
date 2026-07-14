"use client";

import { useState, useTransition } from "react";
import type { JlptSection } from "@prisma/client";
import { createAttemptAction } from "../actions";
import { JLPT_SECTION_LABELS } from "@/constants/jlpt";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function StartAttemptActions({
  testPackageId,
  availableSections,
}: {
  testPackageId: number;
  availableSections: JlptSection[];
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedSection, setSelectedSection] = useState<JlptSection | "">("");

  function handleMockTest() {
    startTransition(() => createAttemptAction({ testPackageId, sectionScope: null }));
  }

  function handleSectionPractice() {
    if (!selectedSection) return;
    startTransition(() =>
      createAttemptAction({ testPackageId, sectionScope: selectedSection }),
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <Button disabled={isPending} onClick={handleMockTest}>
        Mulai Mock Test
      </Button>

      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Latihan per Seksi</span>
          <Select
            value={selectedSection}
            onValueChange={(value) => setSelectedSection(value as JlptSection)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Pilih seksi" />
            </SelectTrigger>
            <SelectContent>
              {availableSections.map((section) => (
                <SelectItem key={section} value={section}>
                  {JLPT_SECTION_LABELS[section]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          disabled={isPending || !selectedSection}
          onClick={handleSectionPractice}
        >
          Mulai Latihan
        </Button>
      </div>
    </div>
  );
}

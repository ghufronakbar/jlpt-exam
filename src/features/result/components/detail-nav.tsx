import Link from "next/link";
import type { JlptSection, MondaiType } from "@prisma/client";
import { JLPT_SECTION_LABELS, MONDAI_TYPE_LABELS, mondaiTypeFullLabel } from "@/constants/jlpt";
import { cn } from "@/lib/utils";

export type NavMondaiItem = {
  id: number;
  mondaiType: MondaiType;
  section: JlptSection;
  correctCount: number;
  totalCount: number;
};

// Pure Server Component (just <Link>s) — reused by both the desktop sticky
// sidebar and the mobile Sheet content in detail-mobile-nav.tsx.
export function DetailNavList({
  items,
  activeId,
  attemptId,
}: {
  items: NavMondaiItem[];
  activeId: number;
  attemptId: number;
}) {
  const grouped = new Map<JlptSection, NavMondaiItem[]>();
  for (const item of items) {
    const list = grouped.get(item.section) ?? [];
    list.push(item);
    grouped.set(item.section, list);
  }

  return (
    <nav className="flex flex-col gap-4">
      {Array.from(grouped.entries()).map(([section, sectionItems]) => (
        <div key={section}>
          <p className="mb-1.5 px-2 text-xs font-semibold text-muted-foreground">
            {JLPT_SECTION_LABELS[section]}
          </p>
          <div className="flex flex-col gap-0.5">
            {sectionItems.map((item) => {
              const isActive = item.id === activeId;
              return (
                <Link
                  key={item.id}
                  href={`/result/${attemptId}/detail?mondai=${item.id}`}
                  title={mondaiTypeFullLabel(item.mondaiType)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    isActive ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted",
                  )}
                >
                  <span className="truncate">{MONDAI_TYPE_LABELS[item.mondaiType]}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {item.correctCount}/{item.totalCount}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function DetailSidebarNav(props: {
  items: NavMondaiItem[];
  activeId: number;
  attemptId: number;
}) {
  return (
    <aside className="sticky top-4 hidden max-h-[calc(100vh-2rem)] w-56 shrink-0 self-start overflow-y-auto rounded-lg border p-3 lg:block">
      <DetailNavList {...props} />
    </aside>
  );
}

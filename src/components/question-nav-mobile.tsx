import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { QuestionNavList, type NavMondaiItem } from "./question-nav";

export function QuestionNavMobile({
  items,
  activeId,
  buildHref,
}: {
  items: NavMondaiItem[];
  activeId: number;
  buildHref: (itemId: number) => string;
}) {
  return (
    <div className="lg:hidden">
      <Sheet>
        <SheetTrigger render={<Button variant="outline" size="sm" />}>
          <Menu className="size-4" />
          Pilih Mondai
        </SheetTrigger>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle>Navigasi Mondai</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-4">
            <QuestionNavList items={items} activeId={activeId} buildHref={buildHref} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DetailNavList, type NavMondaiItem } from "./detail-nav";

export function DetailMobileNav({
  items,
  activeId,
  attemptId,
}: {
  items: NavMondaiItem[];
  activeId: number;
  attemptId: number;
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
            <DetailNavList items={items} activeId={activeId} attemptId={attemptId} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

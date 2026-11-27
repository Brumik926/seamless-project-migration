import type { ReactNode } from "react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

/** Mobile bottom sheet with a grab handle, used for add/edit forms and pickers. */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="mx-auto max-h-[92dvh] max-w-md border-border bg-background">
        <DrawerHeader className="border-b border-border pb-4 text-center">
          <DrawerTitle className="text-xl font-extrabold">{title}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : null}
        </DrawerHeader>
        <div className="overflow-y-auto px-5 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}

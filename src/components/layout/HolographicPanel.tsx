import type { ReactNode } from "react";
import { cx } from "@/components/ui";

export function HolographicPanel({ title, icon, action, children, className, bodyClassName, id }: {
  title?: string; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string; id?: string;
}) {
  return (
    <section id={id} className={cx("holo-panel fade-up flex min-w-0 flex-col", className)} aria-label={title}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <h2 className="hud-label flex items-center gap-2 text-cyan/90">{icon}{title}</h2>
          {action}
        </header>
      )}
      <div className={cx("min-w-0 flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

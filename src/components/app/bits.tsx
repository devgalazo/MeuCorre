import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 px-4 pt-6 pb-4">
      <div>
        {subtitle && <p className="text-xs font-semibold uppercase tracking-widest text-primary">{subtitle}</p>}
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      {right}
    </header>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border bg-card p-4", className)}>{children}</section>;
}

export function Stat({ label, value, tone, big }: { label: string; value: string; tone?: "pos" | "neg" | "accent"; big?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "num truncate font-semibold",
          big ? "text-3xl" : "text-lg",
          tone === "pos" && "text-success",
          tone === "neg" && "text-destructive",
          tone === "accent" && "text-primary",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function NumField({
  label, value, onChange, placeholder = "0", mode = "decimal", prefix, className,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  mode?: "decimal" | "numeric" | "text"; prefix?: string; className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex h-12 items-center rounded-xl border bg-input/40 px-3 focus-within:ring-2 focus-within:ring-ring">
        {prefix && <span className="mr-1 text-sm text-muted-foreground">{prefix}</span>}
        <input
          inputMode={mode}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="num w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/50"
        />
      </div>
    </label>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

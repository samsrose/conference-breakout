import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
      {children}
    </h2>
  );
}

export function CardSubtitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-slate-500 dark:text-slate-400">{children}</p>
  );
}

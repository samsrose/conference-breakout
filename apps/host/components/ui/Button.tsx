import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const styles: Record<Variant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-500",
  secondary:
    "bg-slate-200 text-slate-900 hover:bg-slate-300 focus:ring-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
  danger: "bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-500",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

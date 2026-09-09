import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" };

const styles = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300",
  secondary: "bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 disabled:text-slate-400",
  ghost: "bg-transparent text-indigo-700 hover:bg-indigo-50 disabled:text-slate-400",
};

export function Button({ variant = "primary", className = "", ...props }: Props) {
  return <button {...props} className={`rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${styles[variant]} ${className}`} />;
}

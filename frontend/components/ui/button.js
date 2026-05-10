import { cn } from "@/lib/utils";

export function Button({ className, variant = "default", ...props }) {
  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    outline: "border bg-white hover:bg-slate-50",
    ghost: "hover:bg-slate-100",
    destructive: "bg-red-600 text-white hover:bg-red-700"
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-60",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
}

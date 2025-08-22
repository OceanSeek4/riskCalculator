import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantClasses = {
    default: "bg-blue-600 text-white",
    secondary: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    destructive: "bg-red-600 text-white",
    outline: "border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300",
  };

  return (
    <div 
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variantClasses[variant],
        className
      )} 
      {...props} 
    />
  );
}

export { Badge };
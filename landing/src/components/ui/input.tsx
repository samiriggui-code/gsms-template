import * as React from "react";

import { cn } from "@/lib/utils";

const field =
  "w-full rounded-lg border border-input bg-transparent px-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(field, "h-11", className)} {...props} />;
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(field, "min-h-28 py-3", className)} {...props} />;
}

function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select className={cn(field, "h-11 appearance-none bg-[length:1rem] pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export { Input, Select, Textarea };

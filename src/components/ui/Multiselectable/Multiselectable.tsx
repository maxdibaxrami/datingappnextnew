import * as React from "react";
import { cn } from "@/lib/utils";

export interface MultiselectableProps extends React.HTMLAttributes<HTMLDivElement> {}

const Multiselectable = React.forwardRef<HTMLDivElement, MultiselectableProps>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        Multiselectable
      </div>
    );
  }
);
Multiselectable.displayName = "Multiselectable";

export { Multiselectable };

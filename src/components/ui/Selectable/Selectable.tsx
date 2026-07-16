import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectableProps extends React.HTMLAttributes<HTMLDivElement> {}

const Selectable = React.forwardRef<HTMLDivElement, SelectableProps>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        Selectable
      </div>
    );
  }
);
Selectable.displayName = "Selectable";

export { Selectable };

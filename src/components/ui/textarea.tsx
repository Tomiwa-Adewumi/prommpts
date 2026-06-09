import * as React from "react"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  autoHeight?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoHeight = false, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const combinedRef = (node: HTMLTextAreaElement) => {
      textareaRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const adjustHeight = () => {
      if (!autoHeight || !textareaRef.current) return;

      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    useEffect(() => {
      if (autoHeight) {
        adjustHeight();
      }
    }, [props.value, autoHeight]);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (autoHeight) {
        adjustHeight();
      }
      // Call the original onChange if it exists
      if (props.onChange) {
        props.onChange(e);
      }
    };

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          autoHeight && "overflow-hidden resize-none transition-all duration-200 ease-out",
          className
        )}
        ref={combinedRef}
        style={autoHeight ? { maxHeight: "80vh" } : undefined}
        onChange={handleInput}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
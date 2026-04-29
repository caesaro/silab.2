import * as React from 'react'
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from '../../lib/utils'

const textareaVariants = cva(
  "flex min-h-[96px] w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-3 text-base text-gray-900 dark:text-white ring-offset-white dark:ring-offset-gray-900 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-[80px] md:text-sm",
  {
    variants: {
      size: {
        default: "min-h-[96px] text-base leading-6 md:min-h-[80px] md:text-sm",
        sm: "min-h-[84px] text-sm leading-6 md:min-h-[60px] md:text-xs",
        lg: "min-h-[140px] text-lg leading-7 md:min-h-[120px]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, size, ...props }, ref) => (
    <textarea
      className={cn(textareaVariants({ size, className }))}
      ref={ref}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"

export { Textarea, textareaVariants }

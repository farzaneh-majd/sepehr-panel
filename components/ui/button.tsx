import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#0c66e4]/40 focus-visible:ring-offset-1 aria-invalid:ring-2 aria-invalid:ring-[#c9372c]/25 aria-invalid:border-[#c9372c]",
  {
    variants: {
      variant: {
        default: "bg-[#0c66e4] text-white shadow-sm hover:bg-[#0055cc]",
        destructive:
          "bg-[#c9372c] text-white shadow-sm hover:bg-[#ae2e24]",
        outline:
          "border border-[#b7bdc8] bg-white text-[#172b4d] shadow-xs hover:bg-[#091e420f]",
        secondary:
          "bg-[#f1f2f4] text-[#172b4d] hover:bg-[#dfe1e6]",
        ghost:
          "text-[#44546f] hover:bg-[#091e4224] hover:text-[#172b4d]",
        link: "text-[#0c66e4] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

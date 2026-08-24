import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Badge } from './Badge.vue'

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors [&_svg]:size-3 [&_svg]:shrink-0 [&_svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        outline:
          'border-border bg-background text-foreground',
        success:
          'border-transparent bg-success/15 text-success',
        destructive:
          'border-transparent bg-destructive/15 text-destructive',
        soft:
          'border-transparent bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type BadgeVariants = VariantProps<typeof badgeVariants>

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ring',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        brand: 'border-transparent bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
        success: 'border-transparent bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
        warning: 'border-transparent bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
        info: 'border-transparent bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

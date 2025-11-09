import { cva, VariantProps } from 'class-variance-authority';

export const toastVariants = cva(
  'group toast group-[.toaster]:bg-white/95 group-[.toaster]:text-slate-900 group-[.toaster]:border group-[.toaster]:border-slate-200 group-[.toaster]:shadow-lg group-[.toaster]:shadow-slate-200/60 group-[.toaster]:backdrop-blur-sm',
  {
  variants: {
    variant: {
      default: 'group-[.toaster]:bg-white/95 group-[.toaster]:text-slate-900',
      destructive:
        'group-[.toaster]:bg-rose-50 group-[.toaster]:text-rose-700 destructive group-[.toaster]:border-rose-300 group-[.toaster]:shadow-rose-200/60',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type ZardToastVariants = VariantProps<typeof toastVariants>;

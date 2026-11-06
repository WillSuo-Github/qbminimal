import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// The browser's own drop-down, styled like the app's inputs. Native, so phones show their picker.
export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn('border-input dark:bg-input/30 h-9 min-w-0 rounded-md border bg-transparent px-2 text-sm disabled:opacity-50', className)} {...props} />
}

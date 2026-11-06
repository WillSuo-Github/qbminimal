import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// An on/off switch. Safari 17.4 and newer draw their own iOS switch for it, with a haptic tap on
// iPhone; other browsers get the same shape from the .switch rules in index.css.
export function Switch({ className, onCheckedChange, ...props }: Omit<ComponentProps<'input'>, 'type'> & { onCheckedChange?: (checked: boolean) => void }) {
  return (
    <input
      type="checkbox"
      role="switch"
      // React passes the attribute through as written; the empty value turns it on.
      {...{ switch: '' }}
      className={cn('switch', className)}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  )
}

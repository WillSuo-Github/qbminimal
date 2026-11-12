import { useState } from 'react'

interface Selection {
  scope: string
  keys: ReadonlySet<string>
  anchor: string | null
}

const empty = (scope: string): Selection => ({ scope, keys: new Set(), anchor: null })

// Ranges follow the displayed order. Changing filters or pages clears the selection,
// so the context menu never acts on rows hidden by a different view.
export function useSelection(order: readonly string[], scope: string) {
  const [state, setState] = useState(() => empty(scope))
  if (state.scope !== scope) setState(empty(scope))
  const current = state.scope === scope ? state : empty(scope)
  const selected = new Set(order.filter(key => current.keys.has(key)))

  return {
    selected,
    only(key: string) {
      setState({ scope, keys: new Set([key]), anchor: key })
    },
    toggle(key: string) {
      setState(previous => {
        const keys = new Set(order.filter(id => previous.scope === scope && previous.keys.has(id)))
        if (!keys.delete(key)) keys.add(key)
        return { scope, keys, anchor: key }
      })
    },
    extendTo(key: string, additive = false) {
      setState(previous => {
        const last = order.indexOf(key)
        if (last < 0) return previous
        const anchor = previous.scope === scope && previous.anchor && order.includes(previous.anchor) ? previous.anchor : key
        const first = order.indexOf(anchor)
        const range = order.slice(Math.min(first, last), Math.max(first, last) + 1)
        const keys = additive ? order.filter(id => previous.scope === scope && previous.keys.has(id)) : []
        return { scope, keys: new Set([...keys, ...range]), anchor }
      })
    },
    remove(keys: readonly string[]) {
      setState(previous => ({ ...previous, keys: new Set([...previous.keys].filter(key => !keys.includes(key))) }))
    },
    clear() { setState(empty(scope)) },
  }
}

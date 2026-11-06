import type { RSSRule } from '@/types'
import { t } from '@/i18n'

// The same JSON qBittorrent's own "Export RSS rules" writes: rule names mapped to rule settings.
export function exportRules(rules: Record<string, RSSRule>): string {
  return JSON.stringify(rules, null, 2)
}

// Returns the rules in a file, or a message saying what's wrong with it.
export function parseRulesFile(text: string): Record<string, RSSRule> | string {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return t('This file isn\'t a qBittorrent rules file (it isn\'t JSON)')
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return t('This file isn\'t a qBittorrent rules file')

  const rules: Record<string, RSSRule> = {}
  for (const [name, rule] of Object.entries(data)) {
    if (!name.trim() || !rule || typeof rule !== 'object' || Array.isArray(rule)) return t('The rule "{name}" can\'t be read', { name })
    rules[name] = rule as RSSRule
  }
  if (Object.keys(rules).length === 0) return t('This file has no rules in it')
  return rules
}

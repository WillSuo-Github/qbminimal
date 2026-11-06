import { describe, expect, it } from 'vitest'
import { exportRules, parseRulesFile } from './rssRulesFile'
import type { RSSRule } from '@/types'

const rule: RSSRule = { enabled: true, mustContain: 'linux', mustNotContain: '', useRegex: false, affectedFeeds: ['https://example.org/feed'], assignedCategory: '', savePath: '' }

describe('RSS rules files', () => {
  it('reads back what it exports', () => {
    expect(parseRulesFile(exportRules({ Linux: rule }))).toEqual({ Linux: rule })
  })

  it('explains files it cannot use', () => {
    expect(parseRulesFile('nope')).toMatch(/isn't JSON/)
    expect(parseRulesFile('[]')).toMatch(/isn't a qBittorrent rules file/)
    expect(parseRulesFile('{}')).toMatch(/no rules/)
    expect(parseRulesFile('{"Bad": 3}')).toMatch(/"Bad"/)
  })
})

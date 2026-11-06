import { describe, expect, it } from 'vitest'
import { buildFileTree, type FileTreeFolder } from './fileTree'
import type { TorrentFile } from '@/types'

const file = (index: number, name: string, size: number, priority = 1, progress = 0): TorrentFile => ({ index, name, size, priority, progress })

describe('buildFileTree', () => {
  it('nests files in folders, folders first and names in natural order', () => {
    const tree = buildFileTree([file(0, 'Show/ep10.mkv', 10), file(1, 'Show/ep2.mkv', 10), file(2, 'Show/Extras/a.txt', 1), file(3, 'readme.txt', 1)])
    expect(tree.map(n => n.name)).toEqual(['Show', 'readme.txt'])
    const show = tree[0] as FileTreeFolder
    expect(show.children.map(n => n.name)).toEqual(['Extras', 'ep2.mkv', 'ep10.mkv'])
    expect(show.size).toBe(21)
    expect(show.indexes.sort()).toEqual([0, 1, 2])
  })

  it('knows whether a folder is wanted fully, partly, or not at all', () => {
    const [all] = buildFileTree([file(0, 'A/1', 1), file(1, 'A/2', 1)]) as FileTreeFolder[]
    const [some] = buildFileTree([file(0, 'A/1', 1), file(1, 'A/2', 1, 0)]) as FileTreeFolder[]
    const [none] = buildFileTree([file(0, 'A/1', 1, 0)]) as FileTreeFolder[]
    expect([all.wanted, some.wanted, none.wanted]).toEqual(['all', 'some', 'none'])
  })

  it('adds up downloaded bytes for folder progress', () => {
    const [folder] = buildFileTree([file(0, 'A/1', 100, 1, 1), file(1, 'A/2', 100, 1, 0.5)]) as FileTreeFolder[]
    expect(folder.done / folder.size).toBe(0.75)
  })
})

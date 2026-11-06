import type { TorrentFile } from '@/types'

export interface FileTreeFolder {
  kind: 'folder'
  name: string
  // Path inside the torrent, with "/" between folders.
  path: string
  children: FileTreeNode[]
  size: number
  // Bytes downloaded, for the folder's progress.
  done: number
  // Every file index below this folder, to change them all at once.
  indexes: number[]
  // Whether all, none, or some of the files below are wanted.
  wanted: 'all' | 'none' | 'some'
}

export interface FileTreeFile {
  kind: 'file'
  name: string
  path: string
  file: TorrentFile
}

export type FileTreeNode = FileTreeFolder | FileTreeFile

const byName = (a: FileTreeNode, b: FileTreeNode) =>
  a.kind === b.kind ? a.name.localeCompare(b.name, undefined, { numeric: true }) : a.kind === 'folder' ? -1 : 1

// Turns qBittorrent's flat file list into folders and files, folders first, both in name order.
export function buildFileTree(files: TorrentFile[]): FileTreeNode[] {
  const root: FileTreeFolder = { kind: 'folder', name: '', path: '', children: [], size: 0, done: 0, indexes: [], wanted: 'none' }

  for (const file of files) {
    const parts = file.name.split('/')
    let folder = root
    parts.slice(0, -1).forEach((part, depth) => {
      const path = parts.slice(0, depth + 1).join('/')
      let next = folder.children.find((node): node is FileTreeFolder => node.kind === 'folder' && node.path === path)
      if (!next) {
        next = { kind: 'folder', name: part, path, children: [], size: 0, done: 0, indexes: [], wanted: 'none' }
        folder.children.push(next)
      }
      folder = next
    })
    folder.children.push({ kind: 'file', name: parts[parts.length - 1], path: file.name, file })
  }

  // Totals are filled in from the bottom up.
  const finish = (folder: FileTreeFolder): void => {
    let wanted = 0
    for (const node of folder.children) {
      if (node.kind === 'folder') {
        finish(node)
        folder.size += node.size
        folder.done += node.done
        folder.indexes.push(...node.indexes)
        wanted += node.wanted === 'all' ? node.indexes.length : node.wanted === 'some' ? 0.5 : 0
      } else {
        folder.size += node.file.size
        folder.done += node.file.size * node.file.progress
        folder.indexes.push(node.file.index)
        if (node.file.priority > 0) wanted++
      }
    }
    folder.wanted = wanted === 0 ? 'none' : wanted === folder.indexes.length ? 'all' : 'some'
    folder.children.sort(byName)
  }
  finish(root)
  return root.children
}

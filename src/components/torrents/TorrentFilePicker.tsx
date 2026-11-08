import { Files } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { t } from '@/i18n'
import type { TorrentMetadata } from '@/lib/addTorrent'
import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/utils'

const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter() : null

// Only the first span shrinks, so the browser inserts an ellipsis right before the visible tail.
function MiddleEllipsis({ text, tailLength = 12 }: { text: string; tailLength?: number }) {
  const characters = segmenter ? Array.from(segmenter.segment(text), part => part.segment) : Array.from(text)
  return (
    <span className="flex min-w-0 flex-1 overflow-hidden whitespace-nowrap" dir="ltr" aria-hidden>
      {characters.length <= tailLength ? <span className="truncate">{text}</span> : (
        <>
          <span className="min-w-0 truncate">{characters.slice(0, -tailLength).join('')}</span>
          <span className="flex max-w-[48%] shrink-0 justify-end overflow-hidden">
            <span className="shrink-0">{characters.slice(-tailLength).join('')}</span>
          </span>
        </>
      )}
    </span>
  )
}

// The torrent already has a title above the list. Drop common folders, keeping any
// subfolders that distinguish files and the original paths for tooltips and assistive tech.
function relativeFilePaths(files: TorrentMetadata['files']) {
  const paths = files.map(file => file.path.split('/'))
  let prefix = 0
  const first = paths[0]
  while (first && prefix < first.length - 1
    && paths.every(parts => prefix < parts.length - 1 && parts[prefix] === first[prefix])) prefix++
  return paths.map(parts => parts.slice(prefix).join('/'))
}

interface TorrentFilePickerProps {
  metadata: TorrentMetadata
  priorities: number[]
  onToggleFile: (index: number, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
}

export function TorrentFilePicker({ metadata, priorities, onToggleFile, onSelectAll }: TorrentFilePickerProps) {
  const paths = relativeFilePaths(metadata.files)
  const bytesSelected = metadata.files.reduce((total, file, index) => total + (priorities[index] > 0 ? file.length : 0), 0)
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border bg-card">
      <div className="space-y-1.5 border-b bg-muted/35 px-3 py-2">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold" title={metadata.name}>
          <Files className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="sr-only">{metadata.name}</span>
          <MiddleEllipsis text={metadata.name} />
        </h3>
        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <span className="text-xs tabular-nums text-muted-foreground">
            {t('{size} of {total} selected', { size: formatBytes(bytesSelected), total: formatBytes(metadata.size) })}
          </span>
          <div className="flex items-center">
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onSelectAll(true)}>{t('Select all')}</Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onSelectAll(false)}>{t('Select none')}</Button>
          </div>
        </div>
      </div>
      <ul className="max-h-56 divide-y overflow-y-auto overscroll-contain [scrollbar-width:thin]">
        {metadata.files.map((file, index) => {
          const checked = priorities[index] > 0
          const id = `add-file-${index}`
          return (
            <li key={index} className={cn('flex min-w-0 items-center gap-2.5 ps-3 transition-colors hover:bg-muted/55', checked && 'bg-primary/5 hover:bg-primary/10')}>
              <Checkbox id={id} checked={checked} aria-label={file.path} onCheckedChange={value => onToggleFile(index, value === true)} />
              <Label htmlFor={id} title={file.path} className="flex min-h-9 min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 pe-3 text-xs font-normal sm:text-sm">
                <MiddleEllipsis text={paths[index]} />
                <span className="shrink-0 text-end text-xs whitespace-nowrap tabular-nums text-muted-foreground">{formatBytes(file.length)}</span>
              </Label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

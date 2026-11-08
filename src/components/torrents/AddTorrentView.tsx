import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { FileUp, Loader2, Magnet, Upload } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FreeSpaceHint } from './FreeSpaceHint'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCategories, useTags } from '@/hooks/useApi'
import { toast } from '@/hooks/use-toast'
import { qbitClient } from '@/lib/api'
import {
  DOWNLOAD_ADD_OPTIONS,
  buildAddParams,
  describeAddResult,
  isMagnetLink,
  readMetadata,
  type AddTorrentOptions,
  type TorrentMetadata,
} from '@/lib/addTorrent'
import { onIncoming, takeIncoming } from '@/lib/incoming'
import { TorrentCreator } from './TorrentCreator'
import { TorrentFilePicker } from './TorrentFilePicker'
import { t } from '@/i18n'

const selectClass = 'border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-2 text-sm'
const METADATA_POLL_MS = 1500
const METADATA_TIMEOUT_MS = 120000

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function TriSelect({ id, value, onChange, labels }: { id: string; value: string; onChange: (value: '' | 'true' | 'false') => void; labels: [string, string, string] }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value as '' | 'true' | 'false')} className={selectClass}>
      <option value="">{labels[0]}</option>
      <option value="true">{labels[1]}</option>
      <option value="false">{labels[2]}</option>
    </select>
  )
}

function CheckField({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(!!value)} />
      <Label htmlFor={id} className="text-sm font-normal">{label}</Label>
    </div>
  )
}

type Source = File | string
type SourceKind = 'torrent' | 'magnet'
type Draft = { kind: SourceKind; file: File | null; link: string; pending: Source[] }

const emptyDraft = (): Draft => ({ kind: 'torrent', file: null, link: '', pending: [] })
const draftFor = (source: Source, pending: Source[]): Draft => typeof source === 'string'
  ? { kind: 'magnet', file: null, link: source, pending }
  : { kind: 'torrent', file: source, link: '', pending }

type Preview = { source: Source; attempt: number } & (
  | { metadata: TorrentMetadata; priorities: number[] }
  | { error: string }
)

export function AddTorrentDialog({ onClose }: { onClose: () => void }) {
  const [creator, setCreator] = useState(false)

  return (
    <DialogContent className="max-h-[calc(100dvh-2rem)] grid-cols-[minmax(0,1fr)] overflow-x-hidden overflow-y-auto p-4 sm:max-w-xl sm:p-6">
      <DialogHeader>
        <DialogTitle>{creator ? t('Create torrent') : t('Add torrent')}</DialogTitle>
        <DialogDescription>
          {creator ? t('Create a .torrent from files on the server.') : t('Choose which files to download before starting.')}
        </DialogDescription>
      </DialogHeader>
      {creator ? (
        <>
          <Button type="button" variant="outline" className="w-fit" onClick={() => setCreator(false)}>{t('Back to add torrent')}</Button>
          <TorrentCreator />
        </>
      ) : <AddTorrentForm onClose={onClose} onCreate={() => setCreator(true)} />}
    </DialogContent>
  )
}

function AddTorrentForm({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  const queryClient = useQueryClient()
  const { data: categories } = useCategories()
  const { data: tags } = useTags()
  const [draft, setDraft] = useState(emptyDraft)
  const [options, setOptions] = useState<AddTorrentOptions>(DOWNLOAD_ADD_OPTIONS)
  const [showOptions, setShowOptions] = useState(false)
  const [adding, setAdding] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [attempt, setAttempt] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const enqueue = (sources: Source[]) => {
    if (!sources.length) return
    setDraft(prev => prev.file || prev.link.trim()
      ? { ...prev, pending: [...prev.pending, ...sources] }
      : draftFor(sources[0], [...prev.pending, ...sources.slice(1)]))
  }

  useEffect(() => {
    const take = () => {
      const incoming = takeIncoming()
      enqueue([...incoming.links, ...incoming.files])
    }
    take()
    return onIncoming(take)
  }, [])

  const link = draft.link.trim()
  const source = draft.kind === 'torrent' ? draft.file : isMagnetLink(link) ? link : null
  const current = source && preview?.source === source && preview.attempt === attempt ? preview : null
  const ready = current && 'metadata' in current ? current : null
  const metadataError = current && 'error' in current ? current.error : null
  const fetching = !!source && !current
  const set = <K extends keyof AddTorrentOptions>(key: K, value: AddTorrentOptions[K]) => setOptions(prev => ({ ...prev, [key]: value }))

  useEffect(() => {
    if (!source) return
    const controller = new AbortController()
    const { signal } = controller
    const fail = (error: string) => setPreview({ source, attempt, error })
    const timeout = window.setTimeout(() => {
      controller.abort()
      fail(typeof source === 'string'
        ? t('Couldn\'t get the file list in time. A magnet link needs peers to share it.')
        : t('Couldn\'t get the file list in time'))
    }, METADATA_TIMEOUT_MS)
    const load = async () => {
      try {
        let metadata: TorrentMetadata | null
        if (typeof source === 'string') {
          // Wait briefly for the pasted link to settle, then poll while qBittorrent finds peers.
          do {
            metadata = readMetadata(await qbitClient.fetchMetadata(source, signal))
            if (metadata || signal.aborted) break
            await new Promise(resolve => window.setTimeout(resolve, METADATA_POLL_MS))
          } while (!signal.aborted)
        } else {
          const [parsed] = await qbitClient.parseMetadata([source], signal)
          metadata = readMetadata(parsed)
          if (!metadata?.hash) throw new Error(t('qBittorrent didn\'t return the file list'))
        }
        if (!signal.aborted && metadata) {
          setPreview({ source, attempt, metadata, priorities: metadata.files.map(file => file.priority === 0 ? 0 : 1) })
        }
      } catch (error) {
        if (!signal.aborted) fail(error instanceof Error ? error.message : t('Couldn\'t get the file list'))
      } finally {
        window.clearTimeout(timeout)
      }
    }
    const debounce = window.setTimeout(() => void load(), typeof source === 'string' ? 350 : 0)
    return () => {
      controller.abort()
      window.clearTimeout(timeout)
      window.clearTimeout(debounce)
    }
  }, [source, attempt])

  const setPriorities = (change: (priorities: number[]) => number[]) =>
    setPreview(prev => prev && 'priorities' in prev && prev.source === source && prev.attempt === attempt
      ? { ...prev, priorities: change(prev.priorities) }
      : prev)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (adding || !source || !ready || !ready.priorities.some(priority => priority > 0)) return
    // The preview caches the torrent in qBittorrent. Add by magnet or cached hash so file choices
    // and the seeding rule are applied in the same request that starts the download.
    const input = typeof source === 'string' ? source : ready.metadata.hash
    if (!input) return
    const params = buildAddParams(options, [input], 1)
    if (typeof params === 'string') {
      toast.error(params)
      return
    }
    setAdding(true)
    try {
      const result = await qbitClient.addTorrents(params, [], ready.priorities)
      const { ok, message } = describeAddResult(result, 1)
      if (!ok) {
        toast.error(message)
        return
      }
      toast.success(message)
      void queryClient.invalidateQueries({ queryKey: ['torrents'] })
      if (draft.pending.length) {
        setDraft(prev => prev.pending.length ? draftFor(prev.pending[0], prev.pending.slice(1)) : emptyDraft())
        setOptions(DOWNLOAD_ADD_OPTIONS)
        setShowOptions(false)
        setAttempt(prev => prev + 1)
      } else {
        onClose()
      }
    } catch (error) {
      toast.error(t('Couldn\'t add the torrent'), { description: error instanceof Error ? error.message : undefined })
    } finally {
      setAdding(false)
    }
  }

  const categoryNames = Object.keys(categories ?? {}).sort()

  return (
    <form onSubmit={submit} className="min-w-0 space-y-4">
      <fieldset className="min-w-0 space-y-4" disabled={adding}>
        <Tabs value={draft.kind} onValueChange={value => {
          setDraft(prev => ({ ...prev, kind: value === 'magnet' ? 'magnet' : 'torrent' }))
          setAttempt(prev => prev + 1)
        }}>
          <TabsList className="w-full" aria-label={t('Torrent source')}>
            <TabsTrigger value="torrent"><FileUp />{t('Torrent file')}</TabsTrigger>
            <TabsTrigger value="magnet"><Magnet />{t('Magnet link')}</TabsTrigger>
          </TabsList>
          <TabsContent value="torrent" className="rounded-md border border-dashed p-3">
            <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload />
              {t('Choose .torrent files')}
            </Button>
            <span className="ms-2 text-xs text-muted-foreground">{t('or drop them here')}</span>
            <input ref={fileInputRef} type="file" accept=".torrent,application/x-bittorrent" multiple className="hidden" aria-label={t('Torrent files')} onChange={e => {
              const files = Array.from(e.currentTarget.files ?? []).filter(file => file.name.toLowerCase().endsWith('.torrent'))
              e.currentTarget.value = ''
              if (files.length) setDraft(prev => draftFor(files[0], [...prev.pending, ...files.slice(1)]))
            }} />
            {draft.file && <p className="mt-2 break-all text-sm">{draft.file.name}</p>}
          </TabsContent>
          <TabsContent value="magnet">
            <Field label={t('Magnet link')} htmlFor="add-link">
              <Input id="add-link" value={draft.link} onChange={e => setDraft(prev => ({ ...prev, link: e.target.value }))} autoComplete="off" spellCheck={false} placeholder="magnet:?xt=..." />
              {link && !source && <p className="text-xs text-muted-foreground">{t('Enter a valid magnet link.')}</p>}
            </Field>
          </TabsContent>
        </Tabs>

        {draft.pending.length > 0 && <p className="text-xs text-muted-foreground">{t('{count} more sources waiting', { count: draft.pending.length })}</p>}

        {fetching && (
          <p role="status" className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />{t('Getting file list...')}
          </p>
        )}
        {metadataError && (
          <div role="alert" className="space-y-2 rounded-md border p-3 text-sm">
            <p className="text-destructive">{t('Couldn\'t get the file list')}: {metadataError}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => setAttempt(prev => prev + 1)}>{t('Retry')}</Button>
          </div>
        )}
        {ready && (
          <TorrentFilePicker
            metadata={ready.metadata}
            priorities={ready.priorities}
            onSelectAll={checked => setPriorities(prev => prev.map(() => checked ? 1 : 0))}
            onToggleFile={(index, checked) => setPriorities(prev => prev.map((priority, i) => i === index ? (checked ? 1 : 0) : priority))}
          />
        )}

        {options.shareLimits.mode === 'custom' && options.shareLimits.action === 'Stop' && options.shareLimits.ratio === '1' && !options.shareLimits.seedingMinutes && !options.shareLimits.inactiveMinutes && (
          <p className="text-sm text-muted-foreground">{t('Stop seeding at ratio 1.00')}</p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('Category')} htmlFor="add-category">
            <select id="add-category" value={options.category} onChange={(e) => set('category', e.target.value)} className={selectClass}>
              <option value="">{t('No category')}</option>
              {categoryNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </Field>
          <Field label={t('Tags, separated by commas')} htmlFor="add-tags">
            <Input id="add-tags" list="add-tag-list" value={options.tags} onChange={(e) => set('tags', e.target.value)} className="h-9" />
            <datalist id="add-tag-list">{(tags ?? []).map(tag => <option key={tag} value={tag} />)}</datalist>
          </Field>
        </div>

        <Field label={t('Save path (blank = default)')} htmlFor="add-save-path">
          <Input id="add-save-path" value={options.savePath} onChange={(e) => set('savePath', e.target.value)} className="h-9" />
          <FreeSpaceHint path={options.savePath} />
        </Field>

        <Button type="button" variant="ghost" size="sm" aria-expanded={showOptions} onClick={() => setShowOptions(!showOptions)}>
          {showOptions ? t('Hide options') : t('More options')}
        </Button>

        {showOptions && (
          <div className="space-y-3 rounded-md border p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t('Content layout')} htmlFor="add-layout">
                <select id="add-layout" value={options.contentLayout} onChange={(e) => set('contentLayout', e.target.value as AddTorrentOptions['contentLayout'])} className={selectClass}>
                  <option value="">{t('qBittorrent\'s default')}</option>
                  <option value="Original">{t('Original')}</option>
                  <option value="Subfolder">{t('Create subfolder')}</option>
                  <option value="NoSubfolder">{t('Don\'t create subfolder')}</option>
                </select>
              </Field>
              <Field label={t('Automatic management')} htmlFor="add-auto-tmm">
                <TriSelect id="add-auto-tmm" value={options.autoTMM} onChange={(value) => set('autoTMM', value)} labels={["qBittorrent's default", 'On', 'Off']} />
              </Field>
              <Field label={t('Add to top of queue')} htmlFor="add-queue-top">
                <TriSelect id="add-queue-top" value={options.addToTopOfQueue} onChange={(value) => set('addToTopOfQueue', value)} labels={["qBittorrent's default", 'Yes', 'No']} />
              </Field>
              <Field label={t('Separate folder for incomplete files')} htmlFor="add-use-download-path">
                <TriSelect id="add-use-download-path" value={options.useDownloadPath} onChange={(value) => set('useDownloadPath', value)} labels={["qBittorrent's default", 'Yes', 'No']} />
              </Field>
            </div>

            {options.useDownloadPath === 'true' && (
              <Field label={t('Folder for incomplete files (blank = default)')} htmlFor="add-download-path">
                <Input id="add-download-path" value={options.downloadPath} onChange={(e) => set('downloadPath', e.target.value)} className="h-9" />
              </Field>
            )}

            <Field label={t('Rename torrent (blank = keep its name)')} htmlFor="add-rename">
                <Input id="add-rename" value={options.rename} onChange={(e) => set('rename', e.target.value)} className="h-9" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t('Download limit (KiB/s)')} htmlFor="add-dl-limit">
                <Input id="add-dl-limit" type="number" min={0} placeholder={t('No limit')} value={options.dlLimitKiB} onChange={(e) => set('dlLimitKiB', e.target.value)} className="h-9" />
              </Field>
              <Field label={t('Upload limit (KiB/s)')} htmlFor="add-up-limit">
                <Input id="add-up-limit" type="number" min={0} placeholder={t('No limit')} value={options.upLimitKiB} onChange={(e) => set('upLimitKiB', e.target.value)} className="h-9" />
              </Field>
            </div>

            <Field label={t('Seeding limits')} htmlFor="add-share-mode">
              <select id="add-share-mode" value={options.shareLimits.mode} onChange={(e) => set('shareLimits', { ...options.shareLimits, mode: e.target.value as AddTorrentOptions['shareLimits']['mode'] })} className={selectClass}>
                <option value="global">{t('qBittorrent\'s global limits')}</option>
                <option value="none">{t('No limit')}</option>
                <option value="custom">{t('Custom limits')}</option>
              </select>
            </Field>
            {options.shareLimits.mode === 'custom' && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field label={t('Ratio')} htmlFor="add-ratio">
                  <Input id="add-ratio" type="number" min={0} step="any" placeholder={t('No limit')} value={options.shareLimits.ratio} onChange={(e) => set('shareLimits', { ...options.shareLimits, ratio: e.target.value })} className="h-9" />
                </Field>
                <Field label={t('Seeding time (minutes)')} htmlFor="add-seeding-time">
                  <Input id="add-seeding-time" type="number" min={0} step={1} placeholder={t('No limit')} value={options.shareLimits.seedingMinutes} onChange={(e) => set('shareLimits', { ...options.shareLimits, seedingMinutes: e.target.value })} className="h-9" />
                </Field>
                <Field label={t('Inactive time (minutes)')} htmlFor="add-inactive-time">
                  <Input id="add-inactive-time" type="number" min={0} step={1} placeholder={t('No limit')} value={options.shareLimits.inactiveMinutes} onChange={(e) => set('shareLimits', { ...options.shareLimits, inactiveMinutes: e.target.value })} className="h-9" />
                </Field>
                <Field label={t('When seeding limits are reached')} htmlFor="add-share-action">
                  <select id="add-share-action" value={options.shareLimits.action} onChange={e => set('shareLimits', { ...options.shareLimits, action: e.target.value === 'Stop' ? 'Stop' : 'Default' })} className={selectClass}>
                    <option value="Stop">{t('Stop seeding')}</option>
                    <option value="Default">{t('qBittorrent\'s default')}</option>
                  </select>
                </Field>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <CheckField id="add-skip-check" label={t('Skip hash check')} checked={options.skipChecking} onChange={(value) => set('skipChecking', value)} />
              <CheckField id="add-sequential" label={t('Sequential download')} checked={options.sequentialDownload} onChange={(value) => set('sequentialDownload', value)} />
              <CheckField id="add-first-last" label={t('First and last pieces first')} checked={options.firstLastPiecePrio} onChange={(value) => set('firstLastPiecePrio', value)} />
              <CheckField id="add-forced" label={t('Force start')} checked={options.forced} onChange={(value) => set('forced', value)} />
            </div>
          </div>
        )}

      </fieldset>
      <Button type="submit" className="w-full" disabled={adding || !ready?.priorities.some(priority => priority > 0)}>
        {adding && <Loader2 className="size-4 animate-spin" />}
        {t('Add and start downloading')}
      </Button>
      {!draft.file && !link && <Button type="button" variant="ghost" size="sm" onClick={onCreate}>{t('Create torrent')}</Button>}
    </form>
  )
}

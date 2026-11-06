import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import type { RSSFeed } from '@/types'

// The last part of a backslash-separated RSS path.
export const rssName = (path: string) => path.split('\\').pop() ?? path

// One dialog covers every RSS action that needs typing or choosing something.
export type Prompt =
  | { kind: 'addFeed' }
  | { kind: 'addFolder' }
  | { kind: 'rename'; path: string; isFolder: boolean }
  | { kind: 'move'; path: string }
  | { kind: 'url'; feed: RSSFeed }
  | { kind: 'interval'; feed: RSSFeed }
  | { kind: 'remove'; path: string; isFolder: boolean }

// An RSS change that confirms itself with a notification and refreshes the feeds.
export function useRSSAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ work }: { work: () => Promise<unknown>; done: string; failed: string }) => work(),
    onSuccess: (_result, { done }) => {
      toast.success(done)
      queryClient.invalidateQueries({ queryKey: ['rss'] })
    },
    onError: (error, { failed }) => toast.error(failed, { description: error instanceof Error ? error.message : undefined }),
  })
}


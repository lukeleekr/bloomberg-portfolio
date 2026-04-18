import type { PostStatus } from '../../lib/posts-shared'

export default function StatusChip({ status }: { status: PostStatus }) {
  if (status === 'public') return null

  const label = status === 'draft' ? 'DRAFT' : 'PRIVATE'

  return (
    <span className='ml-2 inline-block border border-bb-amber px-2 py-0.5 text-xs text-bb-amber'>
      {label}
    </span>
  )
}

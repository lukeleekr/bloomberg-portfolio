import { formatInTimeZone } from 'date-fns-tz'
import Link from 'next/link'
import { excerpt } from '../../lib/posts-shared'
import type { Post } from '../../lib/posts-shared'
import StatusChip from './StatusChip'

function formatKst(iso: string): string {
  // date-fns-tz is installed in Task 2; keep the fallback only for bad input.
  try {
    return formatInTimeZone(new Date(iso), 'Asia/Seoul', 'yyyy-MM-dd HH:mm')
  } catch {
    const d = new Date(iso)
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
    return kst.toISOString().slice(0, 16).replace('T', ' ')
  }
}

export default function PostListItem({ post }: { post: Post }) {
  const ts = post.published_at ?? post.created_at

  return (
    <li className='grid grid-cols-[140px_1fr] items-baseline gap-4 border-b border-bb-gray/30 py-3'>
      <span className='text-xs tabular-nums text-bb-gray'>
        {formatKst(ts)} KST
      </span>
      <div>
        <Link
          href={`/blog/${post.slug}`}
          className='text-bb-white transition-colors hover:text-bb-orange'
        >
          {post.title}
        </Link>
        <StatusChip status={post.status} />
        <p className='mt-1 truncate text-sm text-bb-gray'>
          {excerpt(post.body_md, 200)}
        </p>
      </div>
    </li>
  )
}

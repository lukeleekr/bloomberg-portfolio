import { formatInTimeZone } from 'date-fns-tz'
import Link from 'next/link'
import { excerpt, readingTimeMinutes, topicLabel } from '../../lib/posts-shared'
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
  const summary = post.summary || excerpt(post.body_md, 200)
  const readMins = readingTimeMinutes(post.body_md)

  return (
    <li className='grid gap-4 border-b border-bb-gray/30 py-4 md:grid-cols-[132px_1fr]'>
      <div className='text-xs tabular-nums text-bb-gray'>
        <div>{formatKst(ts).slice(0, 10)}</div>
        <span className='mt-2 inline-block border border-bb-gray/40 px-2 py-0.5'>
          {readMins} MIN
        </span>
      </div>
      <div>
        <div className='mb-2 flex flex-wrap items-center gap-2'>
          <Link
            href={`/blog?topic=${post.topic}`}
            className='border border-bb-orange px-2 py-0.5 text-xs uppercase text-bb-orange hover:bg-bb-orange hover:text-black'
          >
            {topicLabel(post.topic)}
          </Link>
          <StatusChip status={post.status} />
        </div>
        <Link
          href={`/blog/${post.slug}`}
          className='text-bb-white transition-colors hover:text-bb-orange'
        >
          {post.title}
        </Link>
        <p className='mt-2 text-sm leading-relaxed text-bb-gray'>{summary}</p>
      </div>
    </li>
  )
}

import { formatInTimeZone } from 'date-fns-tz'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isAdminFromCookies } from '../../lib/admin-session'
import { excerpt } from '../../lib/posts-shared'
import { getPostBySlug } from '../../lib/posts-server'
import MarkdownView from '../_components/MarkdownView'
import StatusChip from '../_components/StatusChip'
import DeletePostButton from './DeletePostButton'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ slug: string }> }

function formatKst(iso: string): string {
  try {
    return formatInTimeZone(new Date(iso), 'Asia/Seoul', 'yyyy-MM-dd HH:mm')
  } catch {
    return iso.slice(0, 16).replace('T', ' ')
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) return { title: 'Not Found' }

  const admin = await isAdminFromCookies()
  if (post.status !== 'public' && !admin) return { title: 'Not Found' }

  const description = excerpt(post.body_md, 160)

  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      url: `https://lukeyhlee.com/blog/${post.slug}`,
    },
  }
}

export default async function BlogDetailPage({ params }: PageProps) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) notFound()

  const admin = await isAdminFromCookies()
  if (post.status !== 'public' && !admin) notFound()

  const ts = post.published_at ?? post.created_at

  return (
    <main className='min-h-screen bg-bb-dark font-mono text-bb-white'>
      <header className='flex items-center justify-between border-b border-bb-gray/30 px-6 py-4'>
        <Link href='/blog' className='text-bb-orange hover:text-bb-amber'>
          ← BLOG
        </Link>
        <span className='text-xs text-bb-gray'>{formatKst(ts)} KST</span>
        {admin ? (
          <div className='flex gap-2'>
            <Link
              href={`/blog/${post.slug}/edit`}
              className='border border-bb-orange px-3 py-1 text-sm text-bb-orange hover:bg-bb-orange hover:text-black'
            >
              EDIT
            </Link>
            <DeletePostButton
              slug={post.slug}
              title={post.title}
              isAdmin={admin}
            />
          </div>
        ) : (
          <span />
        )}
      </header>

      <div className='mx-auto grid max-w-[1100px] gap-8 px-6 py-8 md:grid-cols-[220px_1fr]'>
        <aside className='space-y-4 text-sm'>
          <div>
            <div className='text-xs uppercase text-bb-gray'>Date</div>
            <div className='text-bb-white'>{formatKst(ts)} KST</div>
          </div>
          <div>
            <div className='text-xs uppercase text-bb-gray'>Status</div>
            <div>
              <span className='text-bb-white'>{post.status.toUpperCase()}</span>
              <StatusChip status={post.status} />
            </div>
          </div>
          <div>
            <div className='text-xs uppercase text-bb-gray'>Slug</div>
            <div className='break-all text-bb-white'>{post.slug}</div>
          </div>
        </aside>
        <article>
          <h1 className='mb-6 text-3xl text-bb-amber'>{post.title}</h1>
          <MarkdownView source={post.body_md} />
        </article>
      </div>
    </main>
  )
}

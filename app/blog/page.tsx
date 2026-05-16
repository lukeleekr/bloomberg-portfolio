import Link from 'next/link'
import { isAdminFromCookies } from '../lib/admin-session'
import { listPostsForAdmin, listPublicPosts } from '../lib/posts-server'
import {
  isValidTopic,
  POST_TOPICS,
  topicFilterClassName,
  topicLabel,
} from '../lib/posts-shared'
import PostListItem from './_components/PostListItem'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{ topic?: string | string[] }>
}

export default async function BlogListPage({ searchParams }: PageProps) {
  const admin = await isAdminFromCookies()
  const posts = admin ? await listPostsForAdmin() : await listPublicPosts()
  const query = await searchParams
  const topicParam = Array.isArray(query.topic) ? query.topic[0] : query.topic
  const activeTopic = isValidTopic(topicParam) ? topicParam : null
  const visiblePosts = activeTopic
    ? posts.filter((post) => post.topic === activeTopic)
    : posts

  const topicCounts = new Map<string, number>()
  for (const post of posts) {
    topicCounts.set(post.topic, (topicCounts.get(post.topic) ?? 0) + 1)
  }

  return (
    <main className='min-h-screen bg-bb-dark font-mono text-bb-white'>
      <header className='flex items-center justify-between border-b border-bb-gray/30 px-6 py-4'>
        <Link href='/' className='text-bb-orange hover:text-bb-amber'>
          ← HOME
        </Link>
        <h1 className='text-xl text-bb-amber'>BLOG</h1>
        {admin ? (
          <Link
            href='/blog/new'
            className='border border-bb-orange px-3 py-1 text-sm text-bb-orange hover:bg-bb-orange hover:text-black'
          >
            + NEW POST
          </Link>
        ) : (
          <span />
        )}
      </header>

      <section className='mx-auto max-w-[850px] px-6 py-6'>
        <div className='mb-5 flex flex-wrap items-center gap-2'>
          <Link
            href='/blog'
            className={`border border-bb-orange bg-[#1a0a00] px-2 py-1 text-xs text-bb-orange transition-colors hover:bg-bb-orange hover:text-black ${
              activeTopic === null ? 'font-semibold ring-1 ring-current' : ''
            }`}
          >
            ALL {posts.length}
          </Link>
          {POST_TOPICS.map((topic) => {
            const count = topicCounts.get(topic.value) ?? 0
            if (count === 0) return null
            const active = activeTopic === topic.value
            return (
              <Link
                key={topic.value}
                href={`/blog?topic=${topic.value}`}
                className={topicFilterClassName(topic.value, active)}
              >
                {topic.label.toUpperCase()} {count}
              </Link>
            )
          })}
        </div>

        {activeTopic ? (
          <div className='mb-4 border-b border-bb-gray/30 pb-3 text-xs uppercase text-bb-gray'>
            Showing <span className='text-bb-amber'>{topicLabel(activeTopic)}</span>{' '}
            notes
          </div>
        ) : null}

        {visiblePosts.length === 0 ? (
          <p className='py-24 text-center text-lg text-bb-amber'>NO POSTS YET</p>
        ) : (
          <ul>
            {visiblePosts.map((post) => (
              <PostListItem key={post.id} post={post} />
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

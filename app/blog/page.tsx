import Link from 'next/link'
import { isAdminFromCookies } from '../lib/admin-session'
import { listPostsForAdmin, listPublicPosts } from '../lib/posts-server'
import PostListItem from './_components/PostListItem'

export const dynamic = 'force-dynamic'

export default async function BlogListPage() {
  const admin = await isAdminFromCookies()
  const posts = admin ? await listPostsForAdmin() : await listPublicPosts()

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

      <section className='mx-auto max-w-[900px] px-6 py-6'>
        {posts.length === 0 ? (
          <p className='py-24 text-center text-lg text-bb-amber'>NO POSTS YET</p>
        ) : (
          <ul>
            {posts.map((post) => (
              <PostListItem key={post.id} post={post} />
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

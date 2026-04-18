import { notFound, redirect } from 'next/navigation'
import { isAdminFromCookies } from '../../../lib/admin-session'
import { getPostBySlug } from '../../../lib/posts-server'
import PostEditor from '../../_components/PostEditor'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ slug: string }> }

export default async function EditPostPage({ params }: PageProps) {
  const admin = await isAdminFromCookies()
  if (!admin) redirect('/?admin_expired=1')

  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  return <PostEditor mode='edit' initial={post} />
}

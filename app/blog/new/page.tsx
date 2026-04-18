import { redirect } from 'next/navigation'
import { isAdminFromCookies } from '../../lib/admin-session'
import PostEditor from '../_components/PostEditor'

export const dynamic = 'force-dynamic'

export default async function NewPostPage() {
  const admin = await isAdminFromCookies()
  if (!admin) redirect('/?admin_expired=1')

  return <PostEditor mode='create' />
}

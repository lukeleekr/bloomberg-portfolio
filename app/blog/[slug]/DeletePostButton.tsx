'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  slug: string
  title: string
  isAdmin: boolean
}

export default function DeletePostButton({ slug, title, isAdmin }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  if (!isAdmin) return null

  async function onDelete() {
    if (deleting) return
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return

    setDeleting(true)

    try {
      const res = await fetch(`/api/posts/${slug}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      if (res.status === 401) {
        router.push('/?admin_expired=1')
        return
      }

      if (!res.ok) {
        setDeleting(false)
        alert('Delete failed.')
        return
      }

      router.push('/blog')
      router.refresh()
    } catch (err) {
      console.error(err)
      setDeleting(false)
      alert('Network error while deleting.')
    }
  }

  return (
    <button
      type='button'
      onClick={onDelete}
      disabled={deleting}
      className='border border-bb-red px-3 py-1 text-sm text-bb-red hover:bg-bb-red hover:text-black disabled:opacity-50'
    >
      {deleting ? 'DELETING…' : 'DELETE'}
    </button>
  )
}

export default function Loading() {
  return (
    <main className='flex min-h-screen items-center justify-center bg-bb-dark font-mono text-bb-amber'>
      <p className='text-xl'>
        LOADING
        <span className='ml-1 inline-block h-5 w-2 animate-pulse bg-bb-amber' />
      </p>
    </main>
  )
}

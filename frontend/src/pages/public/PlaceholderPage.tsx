interface PlaceholderPageProps {
  title: string
  description: string
}

function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-4 px-4 py-12">
      <h1 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
        {title}
      </h1>
      <p className="text-center text-base text-neutral-600 dark:text-neutral-300">
        {description}
      </p>
      <a
        href="/"
        className="rounded-md border border-neutral-300 px-4 py-2 hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800"
      >
        Back to Home
      </a>
    </main>
  )
}

export default PlaceholderPage

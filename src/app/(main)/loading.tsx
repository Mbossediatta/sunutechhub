export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      {/* Skeleton header */}
      <div className="mb-8">
        <div className="h-4 w-24 bg-muted rounded-full mb-2 animate-pulse" />
        <div className="h-8 w-64 bg-muted rounded-xl animate-pulse mb-2" />
        <div className="h-4 w-48 bg-muted rounded-full animate-pulse" />
      </div>
      {/* Skeleton cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card overflow-hidden animate-pulse">
            <div className="h-36 bg-muted" />
            <div className="p-4 flex flex-col gap-2">
              <div className="h-4 bg-muted rounded-full w-3/4" />
              <div className="h-3 bg-muted rounded-full w-full" />
              <div className="h-3 bg-muted rounded-full w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

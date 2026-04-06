export function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 bg-muted rounded w-40" />
      <div className="h-4 bg-muted rounded w-56" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded-lg" />
        ))}
      </div>
      <div className="h-52 bg-muted rounded-lg" />
      <div className="h-36 bg-muted rounded-lg" />
    </div>
  );
}

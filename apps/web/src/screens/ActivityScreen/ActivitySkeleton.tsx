function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className ?? ''}`} />;
}

export default function ActivitySkeleton() {
  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Bone className="h-8 w-40" />
        <Bone className="h-4 w-64" />
      </div>

      {/* Monthly stats */}
      <div className="glass p-5 rounded-xl space-y-4">
        <Bone className="h-5 w-44" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-4">
              <Bone className="h-6 w-6 rounded-full" />
              <Bone className="h-7 w-16" />
              <Bone className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="glass p-4 rounded-xl">
        <Bone className="h-6 w-36 mx-auto mb-4" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }, (_, i) => (
            <Bone key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

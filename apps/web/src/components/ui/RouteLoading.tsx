import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function RouteLoading() {
  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center">
      <LoadingSpinner size="xl" variant="accent" />
    </div>
  );
}


import { DayViewSkeleton, TabsSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl">
      <TabsSkeleton />
      <DayViewSkeleton />
    </div>
  );
}

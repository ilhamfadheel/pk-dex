import { Suspense } from "react";
import type { Metadata } from "next";
import CompareView from "@/components/CompareView";
import { data } from "@/lib/data";

export const metadata: Metadata = { title: "Compare units" };

export default function ComparePage() {
  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Compare units</h1>
        <p className="text-sm text-muted">
          Put up to 4 units side by side: stats, slots, ability, and what it takes to get each one.
        </p>
      </div>
      <Suspense fallback={<div className="card h-64 animate-pulse" />}>
        <CompareView data={data} />
      </Suspense>
    </>
  );
}

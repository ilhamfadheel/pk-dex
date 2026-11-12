import { Suspense } from "react";
import type { Metadata } from "next";
import CompareView from "@/components/CompareView";
import { data } from "@/lib/data";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Compare Units – Stats Side by Side",
  description:
    "Compare up to 4 Pocket Kingdom: Own the World units side by side: HP, ATK, DEF, AGI, DEX, WIS, INT, hit rate, slots, abilities and how many rank-ups, battles and VP each one takes to get.",
  path: "/compare",
});

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

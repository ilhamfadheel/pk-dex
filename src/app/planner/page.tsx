import { Suspense } from "react";
import type { Metadata } from "next";
import PlannerWithUrl from "@/components/PlannerWithUrl";
import { data } from "@/lib/data";

export const metadata: Metadata = { title: "Rank-up Planner" };

export default function PlannerPage() {
  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Rank-up Planner</h1>
        <p className="text-sm text-muted">
          Pick the unit you have and the unit you want. You get every evolution path, the emblem for
          each step and the total ores, jewels and items to farm.
        </p>
      </div>
      {/* searchParams are read client-side; the shell (header, this text) is static. */}
      <Suspense fallback={<div className="card h-64 animate-pulse" />}>
        <PlannerWithUrl data={data} />
      </Suspense>
    </>
  );
}

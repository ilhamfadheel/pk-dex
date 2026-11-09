"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { PlannerData } from "@/lib/types";
import RankupPlanner from "./RankupPlanner";

export default function PlannerWithUrl({ data }: { data: PlannerData }) {
  const sp = useSearchParams();
  const router = useRouter();
  const bySlug = (s: string | null) => data.units.find((u) => u.slug === s);
  const to = bySlug(sp.get("to")) ?? data.units.find((u) => u.slug === "paladin")!;
  const from = bySlug(sp.get("from")) ?? null;

  return (
    <RankupPlanner
      key={`${from?.id}-${to.id}`}
      data={data}
      initialFrom={from?.id ?? null}
      initialTo={to.id}
      onChange={(f, t) => {
        const q = new URLSearchParams();
        if (f != null) q.set("from", data.units.find((u) => u.id === f)!.slug);
        q.set("to", data.units.find((u) => u.id === t)!.slug);
        router.replace(`/planner?${q}`, { scroll: false });
      }}
    />
  );
}

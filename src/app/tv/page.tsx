import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/session";
import { getTvSnapshot } from "@/lib/data/repo";
import { TVDashboard } from "@/components/modules/TVDashboard";

export const metadata: Metadata = { title: "TV Display" };
export const dynamic = "force-dynamic";

export default async function TVPage() {
  await requirePageUser("tv:view");
  return <TVDashboard initial={await getTvSnapshot()} />;
}

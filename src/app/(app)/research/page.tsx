import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/session";
import { listDocuments, listProjects } from "@/lib/data/repo";
import { HolographicPanel } from "@/components/layout/HolographicPanel";
import { ResearchLibrary } from "@/components/modules/ResearchLibrary";
import { KPIWidget } from "@/components/dashboard/KPIWidget";
import { PageHeader } from "@/components/ui";
import { BookOpen, FileCheck2, Ruler, FlaskConical } from "lucide-react";

export const metadata: Metadata = { title: "Research Knowledge Centre" };

export default async function ResearchPage() {
  const user = await requirePageUser("research:read");
  const [{ documents, hiddenCount }, { projects }] = await Promise.all([listDocuments(user), listProjects(user)]);
  const n = (k: string) => documents.filter((d) => d.kind === k).length;
  return (
    <>
      <PageHeader title="Research Knowledge Centre" subtitle="Literature, paper summaries, standards, lab schedules and approved reports — filtered to your clearance level on the server." />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPIWidget label="Literature & summaries" value={n("LITERATURE") + n("PAPER_SUMMARY")} icon={<BookOpen size={20} />} />
        <KPIWidget label="Standards" value={n("STANDARD")} icon={<Ruler size={20} />} />
        <KPIWidget label="Lab schedules" value={n("TEST_SCHEDULE")} icon={<FlaskConical size={20} />} />
        <KPIWidget label="Approved reports" value={documents.filter((d) => d.kind === "REPORT" && d.status === "APPROVED").length} icon={<FileCheck2 size={20} />} tone="var(--color-teal)" />
      </div>
      <HolographicPanel>
        <ResearchLibrary documents={documents} projects={projects.map((p) => ({ id: p.id, code: p.code }))} hiddenCount={hiddenCount} />
      </HolographicPanel>
    </>
  );
}

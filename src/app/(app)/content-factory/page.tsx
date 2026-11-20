import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/session";
import { permissionsFor } from "@/lib/permissions";
import { listContent } from "@/lib/data/repo";
import { integrationStatus } from "@/lib/integrations";
import { HolographicPanel } from "@/components/layout/HolographicPanel";
import { ContentApprovalPanel } from "@/components/modules/ContentApprovalPanel";
import { KPIWidget } from "@/components/dashboard/KPIWidget";
import { Badge, PageHeader } from "@/components/ui";
import { Clapperboard, ShieldCheck, UserCheck, Radio } from "lucide-react";

export const metadata: Metadata = { title: "AI Content Factory" };

export default async function ContentFactoryPage() {
  const user = await requirePageUser("content:read");
  const items = await listContent(user);
  const integrations = integrationStatus().filter((i) => ["elevenlabs", "tiktok", "ai"].includes(i.key));
  return (
    <>
      <PageHeader
        title="AI Content Factory"
        subtitle="Social-media production tracker. No video can be recorded as published without a passing fact-check, PNC confidentiality screening and authorised human approval."
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPIWidget label="Ideas & in production" value={items.filter((i) => !["PUBLISHED", "REJECTED"].includes(i.status)).length} icon={<Clapperboard size={20} />} />
        <KPIWidget label="Awaiting checks" value={items.filter((i) => ["FACT_CHECK", "PNC_REVIEW"].includes(i.status)).length} icon={<ShieldCheck size={20} />} tone="var(--color-violet)" />
        <KPIWidget label="Awaiting approval" value={items.filter((i) => i.status === "READY_FOR_APPROVAL").length} icon={<UserCheck size={20} />} tone="var(--color-amber)" />
        <KPIWidget label="Published" value={items.filter((i) => i.status === "PUBLISHED").length} icon={<Radio size={20} />} tone="var(--color-teal)" />
      </div>
      <HolographicPanel className="mb-4" title="Integration status">
        <ul className="grid gap-2 md:grid-cols-3">
          {integrations.map((i) => (
            <li key={i.key} className="rounded-lg border border-line bg-bg/40 p-2 text-xs">
              <div className="flex items-center justify-between gap-2"><span className="text-ink">{i.name}</span><Badge tone="muted">not connected</Badge></div>
              <p className="mt-1 text-muted">{i.note}</p>
            </li>
          ))}
        </ul>
      </HolographicPanel>
      <ContentApprovalPanel initial={items} perms={permissionsFor(user.role)} userId={user.id} />
    </>
  );
}

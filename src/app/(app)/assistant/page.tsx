import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/session";
import { integrationStatus } from "@/lib/integrations";
import { HolographicPanel } from "@/components/layout/HolographicPanel";
import { VoiceCommandPanel } from "@/components/ai/VoiceCommandPanel";
import { Badge, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "AURA Assistant" };

export default async function AssistantPage() {
  await requirePageUser("assistant:use");
  const ai = integrationStatus().find((i) => i.key === "ai")!;
  return (
    <>
      <PageHeader
        title="AURA — Acoustic Unified Research Assistant"
        subtitle="Version 1 is a rule-based assistant over live application data. Each reply shows whether it came from a local command, a live data query, or an external AI model."
        actions={<Badge tone="muted">External AI: {ai.status === "NOT_CONFIGURED" ? "not connected" : "configured, not implemented"}</Badge>}
      />
      <HolographicPanel>
        <VoiceCommandPanel variant="full" orbSize="min(360px, 80vw)" />
      </HolographicPanel>
      <p className="mt-3 text-xs text-muted">Voice: push-to-talk via the browser&apos;s speech recognition (Chrome, Edge, Safari). The microphone is only active while the core is listening. Replies can be read aloud with the browser&apos;s built-in voice.</p>
    </>
  );
}

import "server-only";

/**
 * Integration registry. Every integration is OFF unless explicitly enabled via
 * environment variables AND implemented. Nothing paid is ever enabled silently.
 */
export type IntegrationStatus = "NOT_CONFIGURED" | "CONFIGURED_NOT_IMPLEMENTED" | "ACTIVE";

export interface IntegrationInfo {
  key: string;
  name: string;
  purpose: string;
  status: IntegrationStatus;
  note: string;
}

const flag = (name: string) => process.env[name] === "true";

export function integrationStatus(): IntegrationInfo[] {
  return [
    {
      key: "ai",
      name: "External AI model (AURA)",
      purpose: "Free-form answers beyond local rules",
      status: flag("AI_EXTERNAL_ENABLED") && process.env.AI_API_KEY ? "CONFIGURED_NOT_IMPLEMENTED" : "NOT_CONFIGURED",
      note: "Interface in place (AIProvider). Requires separate paid API credits — chat subscriptions do not include API access.",
    },
    {
      key: "gcal",
      name: "Google Calendar",
      purpose: "Sync meetings into the calendar timeline",
      status: flag("GOOGLE_CALENDAR_ENABLED") ? "CONFIGURED_NOT_IMPLEMENTED" : "NOT_CONFIGURED",
      note: "Calendar currently shows events stored in the app.",
    },
    {
      key: "gsheets",
      name: "Google Sheets data adapter",
      purpose: "Low-risk operational data (server-side service account only)",
      status: flag("GOOGLE_SHEETS_ENABLED") ? "CONFIGURED_NOT_IMPLEMENTED" : "NOT_CONFIGURED",
      note: "Never exposed publicly; would implement the DataStore interface.",
    },
    {
      key: "elevenlabs",
      name: "ElevenLabs narration",
      purpose: "Higher-quality voice for AURA / content",
      status: flag("ELEVENLABS_ENABLED") ? "CONFIGURED_NOT_IMPLEMENTED" : "NOT_CONFIGURED",
      note: "AURA uses the browser's built-in speech synthesis. Content Factory tracks narration status manually.",
    },
    {
      key: "tiktok",
      name: "TikTok publishing",
      purpose: "Automatic posting after approval",
      status: flag("TIKTOK_ENABLED") ? "CONFIGURED_NOT_IMPLEMENTED" : "NOT_CONFIGURED",
      note: "Not implemented. Approved videos are posted by a person; the URL is then recorded.",
    },
  ];
}

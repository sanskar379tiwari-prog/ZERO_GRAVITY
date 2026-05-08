import type { JobMatch } from "@/types/job";

const API_BASE = "http://localhost:8000";

interface MatchRequestProfile {
  roles?: string[];
  location?: string;
}

export async function fetchMatchedJobs(
  profile: MatchRequestProfile & Record<string, unknown>,
): Promise<JobMatch[]> {
  const query = profile.roles?.[0] ?? "software engineer";
  const location = profile.location ?? "";
  const response = await fetch(`${API_BASE}/api/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, query, location }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch matched jobs");
  }

  return response.json();
}

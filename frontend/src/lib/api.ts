import type { JobMatch } from "@/types/job";
import type { ApplicationRecord, ApplicationStatus } from "@/types/application";

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

  const data = await response.json();
  console.log("MATCH API RESPONSE:", data);
  console.log("LOCAL STORAGE PROFILE:", localStorage.getItem('zg_profile'));
  return data;
}

export async function draftOutreachEmail(
  profile: Record<string, unknown>,
  job: JobMatch,
): Promise<{ subject: string; email_body: string; short_cover: string }> {
  const response = await fetch(`${API_BASE}/draft-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, job }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate outreach draft");
  }

  return response.json();
}

export async function createApplication(payload: {
  job_id: string;
  job_title: string;
  company: string;
  profile_name?: string;
  status?: ApplicationStatus;
}): Promise<ApplicationRecord> {
  const response = await fetch(`${API_BASE}/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to create application record");
  }

  const data = (await response.json()) as Record<string, unknown>;
  return normalizeApplication(data);
}

export async function listApplications(): Promise<ApplicationRecord[]> {
  const response = await fetch(`${API_BASE}/applications`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch applications");
  }

  const data = (await response.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return data.map((item) => normalizeApplication(item as Record<string, unknown>));
}

export async function updateApplicationStatus(
  appId: string,
  status: ApplicationStatus,
): Promise<ApplicationRecord> {
  const response = await fetch(`${API_BASE}/applications/${appId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error("Failed to update application status");
  }

  const data = (await response.json()) as Record<string, unknown>;
  return normalizeApplication(data);
}

function normalizeApplication(raw: Record<string, unknown>): ApplicationRecord {
  const backendStatus = String(raw.status ?? "Pending");
  const status: ApplicationStatus =
    backendStatus === "Offer" ? "Pending" : (backendStatus as ApplicationStatus);

  return {
    app_id: String(raw.id ?? raw.app_id ?? ""),
    job_id: String(raw.job_id ?? ""),
    job_title: String(raw.job_title ?? "Unknown Role"),
    company: String(raw.company ?? "Unknown Company"),
    profile_name: String(raw.profile_name ?? "Candidate"),
    status,
    created_at: String(raw.applied_at ?? raw.created_at ?? new Date().toISOString()),
  };
}

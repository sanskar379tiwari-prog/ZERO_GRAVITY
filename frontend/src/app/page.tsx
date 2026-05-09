"use client";
import { useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { UiverseInput } from "@/components/UiverseInput";
import { TerminalCard } from "@/components/TerminalCard";
import { Loader } from "@/components/Loader";
import { StartButton } from "@/components/StartButton";
import { TrueFocus } from "@/components/TrueFocus";
import { FaultyTerminal } from "@/components/FaultyTerminal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

const STEPS = [
  { id: 1, label: "Parsing Resume",      icon: "📄" },
  { id: 2, label: "Extracting Profile",  icon: "🧠" },
  { id: 3, label: "Discovering Jobs",    icon: "🔍" },
  { id: 4, label: "Scoring Matches",     icon: "⚡" },
];

interface Profile {
  name: string;
  skills: string[];
  experience_years: number;
  roles: string[];
  location: string;
  salary_expectation: { min: number; max: number };
  remote_preference: string;
  github_url?: string;
  linkedin_about?: string;
  linkedin_url?: string;
}

interface CollectedGithub {
  status: string;
  username?: string;
  public_repos?: number;
  followers?: number;
  total_stars?: number;
  top_languages?: [string, number][];
  top_repos?: { name: string; stars: number; language?: string }[];
  reason?: string;
}

interface CollectedLinkedin {
  status: string;
  full_name?: string;
  headline?: string;
  location?: string;
  reason?: string;
}

interface CollectedData {
  github?: CollectedGithub;
  linkedin?: CollectedLinkedin;
}

function extractSkillsFromText(text: string): string[] {
  const seedSkills = [
    "React", "Next.js", "TypeScript", "JavaScript", "Python", "FastAPI",
    "Node.js", "SQL", "MongoDB", "AWS", "Docker", "Git",
  ];
  const lower = text.toLowerCase();
  return seedSkills.filter((skill) => lower.includes(skill.toLowerCase()));
}

function extractGithubUsername(githubUrl: string): string {
  if (!githubUrl.trim()) return "";
  try {
    const parsed = new URL(githubUrl.trim());
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[0] ?? "";
  } catch {
    const cleaned = githubUrl.replace("https://", "").replace("http://", "");
    const parts = cleaned.split("/").filter(Boolean);
    return parts[1] ?? parts[0] ?? "";
  }
}

function extractTopKeywords(text: string, limit = 8): string[] {
  const stop = new Set([
    "the", "and", "with", "that", "from", "this", "have", "your", "for", "are",
    "you", "our", "was", "were", "will", "their", "about", "into", "using", "used",
    "over", "under", "than", "then", "here", "there", "where", "when", "what",
  ]);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stop.has(w));

  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

export default function OnboardingPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile]               = useState<File | null>(null);
  const [resumeBase64, setResumeBase64] = useState<string | null>(null);
  const [dragging, setDragging]       = useState(false);
  const [linkedin, setLinkedin]       = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [github, setGithub]           = useState("");
  const [role, setRole]               = useState("");
  const [location, setLocation]       = useState("");
  const [remote, setRemote]           = useState("flexible");
  const [loading, setLoading]         = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError]             = useState("");
  const [collectLoading, setCollectLoading] = useState(false);
  const [collectError, setCollectError] = useState("");
  const [collectedData, setCollectedData] = useState<CollectedData | null>(null);
  const preview = useMemo(() => {
    const githubUsername = extractGithubUsername(github);
    const inferredSkills = extractSkillsFromText(`${linkedin} ${github}`);
    const linkedinKeywords = extractTopKeywords(linkedin, 6);
    return {
      githubUsername,
      inferredSkills,
      linkedinKeywords,
      role: role.trim() || "Not provided",
      location: location.trim() || "Not provided",
      remotePreference: remote,
      hasAnyInput: Boolean(github.trim() || linkedin.trim() || linkedinUrl.trim() || role.trim() || location.trim()),
    };
  }, [github, linkedin, linkedinUrl, role, location, remote]);

  // ── drag-drop ──────────────────────────────────────────────────────────────
  const readFileAsBase64 = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1] ?? "";
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") {
      setFile(f);
      setError("");
      try {
        const base64 = await readFileAsBase64(f);
        setResumeBase64(base64);
      } catch (err) {
        setError("Failed to read resume file.");
      }
    } else {
      setError("Please upload a PDF file.");
    }
  }, []);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f?.type === "application/pdf") {
      setFile(f); setError("");
      try {
        const base64 = await readFileAsBase64(f);
        setResumeBase64(base64);
      } catch (err) {
        setError("Failed to read resume file.");
      }
    } else {
      setError("Please upload a PDF file.");
    }
  };

  // ── pipeline ───────────────────────────────────────────────────────────────
  const runPipeline = async () => {
    const canRunLinksOnly = Boolean(linkedin.trim() || github.trim() || role.trim());
    if (!file && !canRunLinksOnly) {
      setError("Upload resume OR provide GitHub/LinkedIn/role.");
      return;
    }
    setError(""); setLoading(true); setCurrentStep(1);

    try {
      let profile: Profile;
      
      // Step 1+2: Extract profile (Always use backend now)
      const form = new FormData();
      if (file) form.append("resume_pdf", file);
      if (linkedin) form.append("linkedin_about", linkedin);
      if (github) form.append("github_url", github);
      if (role) form.append("role_preference", role);
      if (location) form.append("location_preference", location);
      if (remote) form.append("remote_preference", remote);

      setCurrentStep(2);
      const profileRes = await fetch(`${API}/extract-profile`, { method: "POST", body: form });
      if (!profileRes.ok) throw new Error("Profile extraction failed");
      profile = await profileRes.json();

      // Step 3: Fetch jobs
      setCurrentStep(3);
      const query = role || profile.roles?.[0] || "software engineer";
      const jobsRes = await fetch(`${API}/jobs?query=${encodeURIComponent(query)}`);
      if (!jobsRes.ok) throw new Error("Job discovery failed");
      const jobs = await jobsRes.json();

      // Step 4: Score jobs (Using standardized /api/match)
      setCurrentStep(4);
      const scoreRes = await fetch(`${API}/api/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, query, location: profile.location || location || "" }),
      });
      const scoredJobs = scoreRes.ok ? await scoreRes.json() : jobs.map((j: any) => ({ ...j, match_score: 0 }));

      // Keep matched jobs store in sync for compare page routing
      const matchRes = await fetch(`${API}/api/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, query, location: profile.location || location || "" }),
      });
      const matchedJobs = matchRes.ok ? await matchRes.json() : [];

      // Store in localStorage and navigate
      localStorage.setItem("zg_profile", JSON.stringify(profile));
      if (resumeBase64) {
        localStorage.setItem("zg_resume_base64", resumeBase64);
      }
      // Standardized to use ONE key: zg_matched_jobs
      localStorage.setItem("zg_matched_jobs", JSON.stringify(scoredJobs.length > 0 ? scoredJobs : matchedJobs));
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(`Pipeline error: ${msg}. Try again.`);
      setLoading(false); setCurrentStep(0);
    }
  };

  const collectFromLinks = async () => {
    if (!github.trim() && !linkedinUrl.trim()) {
      setCollectError("Add at least one GitHub or LinkedIn profile URL.");
      return;
    }
    setCollectError("");
    setCollectLoading(true);
    try {
      const res = await fetch(`${API}/collect-link-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_url: github, linkedin_url: linkedinUrl }),
      });
      if (!res.ok) throw new Error(`Collect failed: ${res.status}`);
      const data = (await res.json()) as CollectedData;
      setCollectedData(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setCollectError(msg);
    } finally {
      setCollectLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-[#fafafa] px-4 py-24">
      {/* Minimal Background Decor */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-60" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="logo-text mb-6 text-sm md:text-base opacity-60">
            Zero Gravity AI
          </p>
          <TrueFocus 
            sentence="Find Matches. Score, Tailor, Apply Faster."
            blurAmount={2}
            borderColor="#7c3aed"
            glowColor="rgba(124, 58, 237, 0.1)"
            animationDuration={0.4}
            pauseBetweenAnimations={2}
          />
          <p className="mx-auto mt-8 max-w-xl text-base text-slate-500 leading-relaxed">
            The minimalist AI orchestration suite. Upload your profile, find your match, and automate your career growth with precision.
          </p>
        </div>

        <div className="mx-auto max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-2 md:p-4">
          <div className="onboarding-card border-none shadow-none !w-full">
            <div className="onboarding-title flex items-center justify-between">
              <span>Pipeline Configuration</span>
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-200" />
                <span className="w-2 h-2 rounded-full bg-slate-200" />
                <span className="w-2 h-2 rounded-full bg-slate-200" />
              </div>
            </div>

          <div className="onboarding-content">
            {/* Step 1: Document Parsing */}
            <div className="onboarding-step">
              <label>Resume Source</label>
              <div
                id="resume-drop-zone"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className="cursor-pointer rounded-xl border border-dashed p-4 text-center transition-all bg-white/5 border-white/10 hover:border-cyan-400/50"
              >
                <p className="text-sm font-medium text-slate-100">
                  {file ? `📄 ${file.name}` : "Drop resume PDF or click to upload"}
                </p>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={onFileChange} />
              </div>
            </div>

            {/* Step 2: Role & Location */}
            <div className="onboarding-step">
              <label>Target Parameters</label>
              <div className="space-y-3">
                <UiverseInput
                  placeholder="Target role (e.g. Frontend Engineer)"
                  value={role}
                  onChange={setRole}
                  buttonText="Role"
                  className="!max-w-full !h-10"
                />
                <UiverseInput
                  placeholder="Preferred location (e.g. Remote, NY)"
                  value={location}
                  onChange={setLocation}
                  buttonText="Loc"
                  className="!max-w-full !h-10"
                />
              </div>
            </div>

            {/* Step 3: Social Connectivity */}
            <div className="onboarding-step">
              <label>Social Intelligence</label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  id="github-input"
                  className="rounded-lg border border-slate-600/60 bg-slate-900/55 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                  placeholder="GitHub URL"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                />
                <input
                  id="linkedin-url-input"
                  className="rounded-lg border border-slate-600/60 bg-slate-900/55 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                  placeholder="LinkedIn URL"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Step 4: Work Style */}
            <div className="onboarding-step">
              <label>Work Style Preference</label>
              <select
                id="remote-select"
                className="w-full rounded-lg border border-slate-600/60 bg-slate-900/55 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                value={remote}
                onChange={(e) => setRemote(e.target.value)}
              >
                <option value="flexible">Flexible Remote Preference</option>
                <option value="remote">Remote Only</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </div>

            <textarea
              id="linkedin-input"
              className="w-full resize-none rounded-lg border border-slate-600/60 bg-slate-900/55 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
              rows={2}
              placeholder="Paste LinkedIn About or hiring notes here..."
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
            />

            <TerminalCard title="AI Extraction Console" className="!m-0 !max-w-full">
              {!preview.hasAnyInput ? (
                <p className="text-center text-xs text-slate-400">
                  Waiting for input... Use the form above to provide details for AI analysis.
                </p>
              ) : (
                <div className="space-y-3 text-[11px]">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 p-1.5 rounded border border-white/5">
                      <span className="text-cyan-400 uppercase">Role:</span> {preview.role}
                    </div>
                    <div className="bg-white/5 p-1.5 rounded border border-white/5">
                      <span className="text-cyan-400 uppercase">Loc:</span> {preview.location}
                    </div>
                  </div>
                  {preview.inferredSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {preview.inferredSkills.map((s) => (
                        <span key={s} className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-200 rounded border border-cyan-500/20">{s}</span>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={collectFromLinks}
                    disabled={collectLoading}
                    className="text-[10px] text-cyan-300 hover:text-cyan-100 underline decoration-cyan-500/50"
                  >
                    {collectLoading ? "Scanning..." : "Re-scan Social Profiles"}
                  </button>
                </div>
              )}
            </TerminalCard>
          </div>

          <div className="onboarding-footer">
            <div className="onboarding-price">
              ⚡ <span>{loading ? "Processing" : "Ready"}</span>
            </div>
            <StartButton
              onClick={runPipeline}
              loading={loading}
              text="Start Discovery"
            />
          </div>
        </div>

        {error && (
          <div className="mx-auto mt-4 max-w-md rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm text-red-300 text-center">
            {error}
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="max-w-md w-full px-6">
              <Loader message={STEPS[currentStep - 1]?.label || "Initializing Orchestrator..."} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

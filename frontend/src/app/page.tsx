"use client";
import { useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { UiverseInput } from "@/components/UiverseInput";
import { TerminalCard } from "@/components/TerminalCard";

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
    <main className="relative min-h-screen overflow-hidden bg-[#041423] px-4 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(120,180,220,0.18),rgba(4,20,35,0.95)_48%)]" />
      <div className="pointer-events-none absolute inset-0">
        {["top-20 left-[12%]", "top-40 left-[72%]", "top-[62%] left-[14%]", "top-[70%] left-[84%]"].map((star) => (
          <span
            key={star}
            className={`absolute h-1.5 w-1.5 rounded-full bg-white/80 shadow-[0_0_14px_rgba(255,255,255,0.7)] ${star}`}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-4xl rounded-2xl border border-cyan-300/20 bg-[#061a2c]/80 p-8 backdrop-blur-sm md:p-12">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="mb-3 text-sm tracking-wide text-cyan-200/80">Zero Gravity AI</p>
          <h1 className="text-4xl font-semibold leading-tight text-slate-100 md:text-6xl">
            Find Matches.
            <br />
            Score, Tailor,
            <br />
            Apply Faster.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm text-slate-300/80 md:text-base">
            Minimal workflow: upload your resume or just use links, run the AI pipeline, and move directly to your personalized job dashboard.
          </p>
        </div>

        <div className="mx-auto max-w-2xl space-y-4">
          <div
            id="resume-drop-zone"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className="cursor-pointer rounded-xl border border-dashed p-6 text-center transition-all"
            style={{
              borderColor: dragging || file ? "rgba(125,211,252,0.9)" : "rgba(148,163,184,0.4)",
              background: dragging ? "rgba(14,116,144,0.25)" : "rgba(15,23,42,0.5)",
            }}
          >
            <p className="text-base font-medium text-slate-100">
              {file ? `Selected: ${file.name}` : "Drop resume PDF or click to upload (optional)"}
            </p>
            {file && (
              <p className="mt-1 text-sm text-slate-300/75">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={onFileChange} id="resume-file-input" />
          </div>

          <div className="flex flex-col gap-4">
            <UiverseInput
              placeholder="Target role (e.g. Frontend Engineer)"
              value={role}
              onChange={setRole}
              buttonText="Role"
              className="max-w-full"
            />
            <UiverseInput
              placeholder="Preferred location (e.g. Remote, NY)"
              value={location}
              onChange={setLocation}
              buttonText="Location"
              className="max-w-full"
            />
            
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                id="github-input"
                className="rounded-lg border border-slate-600/60 bg-slate-900/55 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                placeholder="GitHub URL (optional)"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
              />
              <input
                id="linkedin-url-input"
                className="rounded-lg border border-slate-600/60 bg-slate-900/55 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                placeholder="LinkedIn Profile URL (optional)"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
              <select
                id="remote-select"
                className="col-span-full rounded-lg border border-slate-600/60 bg-slate-900/55 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                value={remote}
                onChange={(e) => setRemote(e.target.value)}
              >
                <option value="flexible">Flexible Remote Preference</option>
                <option value="remote">Remote Only</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </div>
          </div>

          <textarea
            id="linkedin-input"
            className="w-full resize-none rounded-lg border border-slate-600/60 bg-slate-900/55 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
            rows={3}
            placeholder="LinkedIn about text (optional)"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
          />

          <TerminalCard title="AI Extraction Console" className="mt-8">
            {!preview.hasAnyInput ? (
              <p className="text-center text-sm text-slate-300/75">
                Waiting for input... Add GitHub/LinkedIn or upload a resume to see the AI analyze your profile in real-time.
              </p>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-white/5 p-2 border border-white/5">
                    <p className="text-xs uppercase text-cyan-400 mb-1">Target Role</p>
                    <p className="text-slate-100 font-medium">{preview.role}</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2 border border-white/5">
                    <p className="text-xs uppercase text-cyan-400 mb-1">Location</p>
                    <p className="text-slate-100 font-medium">{preview.location}</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2 border border-white/5">
                    <p className="text-xs uppercase text-cyan-400 mb-1">Remote Preference</p>
                    <p className="text-slate-100 font-medium">{preview.remotePreference}</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2 border border-white/5">
                    <p className="text-xs uppercase text-cyan-400 mb-1">GitHub Status</p>
                    <p className="text-slate-100 font-medium">{preview.githubUsername || "Scanning..."}</p>
                  </div>
                </div>

                {preview.inferredSkills.length > 0 && (
                  <div className="animate-fade-in">
                    <p className="mb-2 text-xs uppercase tracking-wider text-slate-400">Inferred Technical Stack</p>
                    <div className="flex flex-wrap gap-2">
                      {preview.inferredSkills.map((skill) => (
                        <span key={skill} className="rounded-md bg-cyan-500/20 border border-cyan-500/30 px-3 py-1 text-xs text-cyan-100">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={collectFromLinks}
                    disabled={collectLoading}
                    className="Subscribe-btn !w-40 !h-10 text-xs"
                  >
                    <span>{collectLoading ? "Scanning..." : "Deep Profile Scan"}</span>
                  </button>
                  {collectError && <span className="text-xs text-red-400 animate-pulse">{collectError}</span>}
                </div>
              </div>
            )}
          </TerminalCard>

          {error && (
            <div className="rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          {loading && (
            <div className="rounded-lg border border-cyan-300/30 bg-slate-900/50 px-4 py-3 text-sm text-slate-200">
              <p className="mb-2 font-medium">Running AI pipeline...</p>
              <div className="space-y-1.5">
                {STEPS.map((step) => (
                  <p key={step.id} className={currentStep >= step.id ? "text-cyan-200" : "text-slate-400"}>
                    {currentStep > step.id ? "✓" : "•"} {step.label}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3 pt-1">
            <button
              id="analyze-btn"
              onClick={runPipeline}
              disabled={loading}
              className="rounded-full border border-cyan-200/40 bg-slate-900/40 px-6 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Processing..." : "Start Matching"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-full bg-slate-100 px-6 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-white"
            >
              Open Dashboard
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

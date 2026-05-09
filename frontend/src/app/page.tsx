"use client";
import { useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BashTerminal } from "@/components/BashTerminal";
import { Loader } from "@/components/Loader";

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
  skills?: string[];
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
  const [logs, setLogs] = useState<{ type: 'cmd' | 'out' | 'err' | 'success'; text: string }[]>([]);

  const addLog = (type: 'cmd' | 'out' | 'err' | 'success', text: string) => {
    setLogs(prev => [...prev, { type, text }]);
  };
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
    setLogs([]);
    addLog('cmd', 'zero-gravity pipeline --start');

    try {
      let profile: Profile;
      
      // Step 1+2: Extract profile
      addLog('out', '[1/4] Uploading resume & extracting profile...');
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
      addLog('success', `Profile extracted: ${profile.name || 'Unknown'} (${profile.skills?.length || 0} skills)`);

      // Step 3: Fetch jobs
      setCurrentStep(3);
      const query = role || profile.roles?.[0] || "software engineer";
      addLog('out', `[2/4] Discovering jobs for "${query}"...`);
      const jobsRes = await fetch(`${API}/jobs?query=${encodeURIComponent(query)}`);
      if (!jobsRes.ok) throw new Error("Job discovery failed");
      const jobs = await jobsRes.json();
      addLog('success', `Found ${jobs.length} job listings`);

      // Step 4: Score jobs
      setCurrentStep(4);
      addLog('out', '[3/4] Running semantic + ATS scoring...');
      const scoreRes = await fetch(`${API}/api/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, query, location: profile.location || location || "" }),
      });
      const scoredJobs = scoreRes.ok ? await scoreRes.json() : jobs.map((j: any) => ({ ...j, match_score: 0 }));
      addLog('success', `Scored ${scoredJobs.length} matches`);

      // Keep matched jobs store in sync for compare page routing
      addLog('out', '[4/4] Finalizing results...');
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
      localStorage.setItem("zg_matched_jobs", JSON.stringify(scoredJobs.length > 0 ? scoredJobs : matchedJobs));
      addLog('success', 'Pipeline complete. Redirecting to dashboard...');
      setTimeout(() => router.push("/dashboard"), 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      addLog('err', `ERROR: ${msg}`);
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
    addLog('cmd', `zero-gravity collect --github="${github}" --linkedin="${linkedinUrl}"`);
    try {
      const res = await fetch(`${API}/collect-link-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_url: github, linkedin_url: linkedinUrl }),
      });
      if (!res.ok) throw new Error(`Collect failed: ${res.status}`);
      const data = (await res.json()) as CollectedData;
      setCollectedData(data);
      addLog('success', `Collected data from ${github ? 'GitHub' : ''} ${linkedinUrl ? 'LinkedIn' : ''}`);
      if (data.skills) addLog('out', `Detected skills: ${data.skills.join(', ')}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      addLog('err', `Collect error: ${msg}`);
      setCollectError(msg);
    } finally {
      setCollectLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-[#fafafa] px-4 py-20">
      <div className="relative z-10 mx-auto max-w-xl">
        {/* Hero Heading */}
        <div className="mb-10 text-center">
          <p className="logo-text mb-3 text-xs tracking-[0.25em] opacity-50">
            Zero Gravity AI
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-[#323232] leading-tight tracking-tight">
            Find Matches.<br />
            <span className="text-[#666]">Score, Tailor, Apply Faster.</span>
          </h1>
          <p className="mt-5 text-base text-[#666] leading-relaxed max-w-md mx-auto">
            Upload your resume, configure your target, and let AI orchestrate your entire job search.
          </p>
        </div>

        {/* Neo-Brutalist Form */}
        <div className="neo-form">
          <div className="text-lg font-black text-[#323232]">
            Pipeline Config<br />
            <span className="text-sm font-600 text-[#666]">fill in your details to start</span>
          </div>

          {/* Resume Upload */}
          <div>
            <label className="neo-label">Resume Source</label>
            <div
              id="resume-drop-zone"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className="neo-dropzone"
            >
              <p className="text-sm font-semibold text-[#323232]">
                {file ? `📄 ${file.name}` : "Drop resume PDF or click to upload"}
              </p>
              <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={onFileChange} />
            </div>
          </div>

          {/* Role & Location */}
          <div>
            <label className="neo-label">Target Role</label>
            <input
              className="neo-input"
              placeholder="e.g. Frontend Engineer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          <div>
            <label className="neo-label">Preferred Location</label>
            <input
              className="neo-input"
              placeholder="e.g. Remote, New York"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Social Links */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="neo-label">GitHub URL</label>
              <input
                id="github-input"
                className="neo-input"
                placeholder="https://github.com/..."
                value={github}
                onChange={(e) => setGithub(e.target.value)}
              />
            </div>
            <div>
              <label className="neo-label">LinkedIn URL</label>
              <input
                id="linkedin-url-input"
                className="neo-input"
                placeholder="https://linkedin.com/in/..."
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Work Style */}
          <div>
            <label className="neo-label">Work Style</label>
            <select
              id="remote-select"
              className="neo-select"
              value={remote}
              onChange={(e) => setRemote(e.target.value)}
            >
              <option value="flexible">Flexible</option>
              <option value="remote">Remote Only</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>

          {/* Extra Notes */}
          <div>
            <label className="neo-label">Additional Notes</label>
            <textarea
              id="linkedin-input"
              className="neo-textarea"
              rows={2}
              placeholder="Paste LinkedIn About or hiring notes here..."
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
            />
          </div>

          {/* Bash Terminal for Logs and Errors */}
          <BashTerminal 
            lines={logs} 
            className="mt-6"
          />

          {/* Submit */}
          <div className="flex items-center justify-between pt-6">
            <span className="text-sm font-bold text-[#323232]">
              ⚡ {loading ? "Pipeline Active" : "Ready to Orchestrate"}
            </span>
            <button
              onClick={runPipeline}
              disabled={loading}
              className="neo-btn px-8"
            >
              {loading ? "Running..." : "Let's go →"}
            </button>
          </div>
        </div>

        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="max-w-xl w-full px-6 flex flex-col items-center">
              <Loader message={STEPS[currentStep - 1]?.label || "Initializing..."} className="mb-8" />
              <BashTerminal lines={logs} className="w-full" />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

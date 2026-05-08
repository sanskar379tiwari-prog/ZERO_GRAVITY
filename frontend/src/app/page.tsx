"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const STEPS = [
  { id: 1, label: "Parsing Resume",      icon: "📄" },
  { id: 2, label: "Extracting Profile",  icon: "🧠" },
  { id: 3, label: "Discovering Jobs",    icon: "🔍" },
  { id: 4, label: "Scoring Matches",     icon: "⚡" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile]               = useState<File | null>(null);
  const [dragging, setDragging]       = useState(false);
  const [linkedin, setLinkedin]       = useState("");
  const [github, setGithub]           = useState("");
  const [role, setRole]               = useState("");
  const [location, setLocation]       = useState("");
  const [remote, setRemote]           = useState("flexible");
  const [loading, setLoading]         = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError]             = useState("");

  // ── drag-drop ──────────────────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") setFile(f);
    else setError("Please upload a PDF file.");
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f?.type === "application/pdf") { setFile(f); setError(""); }
    else setError("Please upload a PDF file.");
  };

  // ── pipeline ───────────────────────────────────────────────────────────────
  const runPipeline = async () => {
    if (!file) { setError("Please upload your resume PDF first."); return; }
    setError(""); setLoading(true); setCurrentStep(1);

    try {
      // Step 1+2: Upload + extract profile
      const form = new FormData();
      form.append("resume_pdf", file);
      if (linkedin)  form.append("linkedin_about", linkedin);
      if (github)    form.append("github_url", github);
      if (role)      form.append("role_preference", role);
      if (location)  form.append("location_preference", location);
      if (remote)    form.append("remote_preference", remote);

      setCurrentStep(2);
      const profileRes = await fetch(`${API}/extract-profile`, { method: "POST", body: form });
      if (!profileRes.ok) throw new Error("Profile extraction failed");
      const profile = await profileRes.json();

      // Step 3: Fetch jobs
      setCurrentStep(3);
      const query = role || profile.roles?.[0] || "software engineer";
      const jobsRes = await fetch(`${API}/jobs?query=${encodeURIComponent(query)}`);
      if (!jobsRes.ok) throw new Error("Job discovery failed");
      const jobs = await jobsRes.json();

      // Step 4: Score jobs
      setCurrentStep(4);
      const scoreRes = await fetch(`${API}/score-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, jobs }),
      });
      const scoredJobs = scoreRes.ok ? await scoreRes.json() : jobs.map((j: object) => ({ ...j, score: null }));

      // Store in localStorage and navigate
      localStorage.setItem("zg_profile", JSON.stringify(profile));
      localStorage.setItem("zg_jobs", JSON.stringify(scoredJobs));
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(`Pipeline error: ${msg}. Try again.`);
      setLoading(false); setCurrentStep(0);
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
            Minimal workflow: upload your resume, run the AI pipeline, and move directly to your personalized job dashboard.
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
              {file ? `Selected: ${file.name}` : "Drop resume PDF or click to upload"}
            </p>
            {file && (
              <p className="mt-1 text-sm text-slate-300/75">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={onFileChange} id="resume-file-input" />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              id="role-input"
              className="rounded-lg border border-slate-600/60 bg-slate-900/55 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
              placeholder="Target role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
            <input
              id="location-input"
              className="rounded-lg border border-slate-600/60 bg-slate-900/55 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
              placeholder="Preferred location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <input
              id="github-input"
              className="rounded-lg border border-slate-600/60 bg-slate-900/55 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
              placeholder="GitHub URL (optional)"
              value={github}
              onChange={(e) => setGithub(e.target.value)}
            />
            <select
              id="remote-select"
              className="rounded-lg border border-slate-600/60 bg-slate-900/55 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
              value={remote}
              onChange={(e) => setRemote(e.target.value)}
            >
              <option value="flexible">Flexible</option>
              <option value="remote">Remote Only</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>

          <textarea
            id="linkedin-input"
            className="w-full resize-none rounded-lg border border-slate-600/60 bg-slate-900/55 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
            rows={3}
            placeholder="LinkedIn about text (optional)"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
          />

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

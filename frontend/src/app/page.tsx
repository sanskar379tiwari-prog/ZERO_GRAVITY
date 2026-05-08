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
    <main className="min-h-screen bg-mesh flex flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <div className="text-center mb-12 animate-slide-up">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border mb-6"
             style={{ borderColor: "rgba(108,99,255,0.3)" }}>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-glow" />
          <span className="text-sm font-medium" style={{ color: "var(--accent-secondary)" }}>
            AI-Powered Job Matching
          </span>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
          <span className="gradient-text">Zero Gravity</span>
        </h1>
        <p className="text-xl max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
          Upload your resume. Let AI find, score, and tailor the best opportunities for you — in seconds.
        </p>
      </div>

      {/* Main card */}
      <div className="w-full max-w-2xl animate-slide-up" style={{ animationDelay: "0.1s" }}>
        <div className="card p-8 glow-purple">

          {/* Drop Zone */}
          <div
            id="resume-drop-zone"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className="relative flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all duration-300 mb-6 p-10 text-center"
            style={{
              border: `2px dashed ${dragging || file ? "var(--accent-primary)" : "var(--border-subtle)"}`,
              background: dragging ? "rgba(108,99,255,0.08)" : file ? "rgba(16,217,160,0.05)" : "rgba(255,255,255,0.02)",
              minHeight: 180,
            }}
          >
            {file ? (
              <>
                <div className="text-5xl mb-3 animate-float">✅</div>
                <p className="font-semibold text-lg" style={{ color: "var(--accent-green)" }}>{file.name}</p>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  {(file.size / 1024).toFixed(1)} KB · Click to change
                </p>
              </>
            ) : (
              <>
                <div className="text-5xl mb-3 animate-float">📄</div>
                <p className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
                  Drop your resume here
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  PDF only · or click to browse
                </p>
              </>
            )}
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={onFileChange} id="resume-file-input" />
          </div>

          {/* Optional fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Target Role
              </label>
              <input id="role-input" className="input-dark" placeholder="e.g. Software Engineer" value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Preferred Location
              </label>
              <input id="location-input" className="input-dark" placeholder="e.g. New York, Remote" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                GitHub URL <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span>
              </label>
              <input id="github-input" className="input-dark" placeholder="https://github.com/username" value={github} onChange={(e) => setGithub(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Remote Preference
              </label>
              <select id="remote-select" className="input-dark" value={remote} onChange={(e) => setRemote(e.target.value)}
                style={{ cursor: "pointer" }}>
                <option value="flexible">Flexible</option>
                <option value="remote">Remote Only</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              LinkedIn About <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional — paste section text)</span>
            </label>
            <textarea id="linkedin-input" className="input-dark resize-none" rows={3}
              placeholder="Paste your LinkedIn About section here for better profile accuracy..."
              value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium"
                 style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Pipeline progress */}
          {loading && (
            <div className="mb-6 rounded-xl p-4 glass" style={{ border: "1px solid var(--border)" }}>
              <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Running AI Pipeline…</p>
              <div className="space-y-2">
                {STEPS.map((step) => (
                  <div key={step.id} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                      currentStep > step.id ? "bg-green-500 text-white" :
                      currentStep === step.id ? "animate-pulse-glow text-white" : "text-gray-600"
                    }`}
                    style={{ background: currentStep > step.id ? "#10d9a0" : currentStep === step.id ? "var(--accent-primary)" : "rgba(255,255,255,0.05)" }}>
                      {currentStep > step.id ? "✓" : step.icon}
                    </div>
                    <span className="text-sm" style={{ color: currentStep >= step.id ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {step.label}
                    </span>
                    {currentStep === step.id && (
                      <div className="ml-auto flex gap-1">
                        {[0,1,2].map(i => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{ background: "var(--accent-primary)", animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            id="analyze-btn"
            onClick={runPipeline}
            disabled={loading}
            className="btn-primary w-full text-base py-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{loading ? "Analyzing…" : "🚀 Analyze My Resume"}</span>
          </button>

          <p className="text-center text-xs mt-4" style={{ color: "var(--text-muted)" }}>
            No data stored on our servers · Your resume is processed in real-time
          </p>
        </div>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-3 mt-10 animate-fade-in" style={{ animationDelay: "0.3s" }}>
        {["🧠 Gemini AI Profile", "🔍 Real Job Discovery", "⚡ ATS Scoring", "📝 Resume Tailoring"].map((f) => (
          <span key={f} className="px-4 py-2 rounded-full text-sm glass"
                style={{ color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
            {f}
          </span>
        ))}
      </div>
    </main>
  );
}

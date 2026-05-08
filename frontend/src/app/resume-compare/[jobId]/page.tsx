"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Job {
  id: string; title: string; company: string; location: string;
  remote: boolean; salary_min: number; salary_max: number;
  description: string; posted_at: string; url: string;
  score?: { match_score: number; ats_keywords?: string[]; reasoning: string[] };
}

interface Profile {
  name: string; skills: string[]; experience_years: number;
  roles: string[]; location: string;
  salary_expectation: { min: number; max: number };
  remote_preference: string;
}

interface TailoredResult {
  tailored_sections: {
    name: string; contact_line: string; summary: string;
    skills: string[]; experience: { title: string; company: string; duration: string; bullets: string[] }[];
    education: { degree: string; school: string; year: string }[];
    projects: { name: string; description: string }[];
    ats_keywords_injected: string[];
  };
  pdf_base64: string;
  ats_keywords: string[];
}

export default function ResumeComparePage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const router = useRouter();

  const [profile, setProfile]   = useState<Profile | null>(null);
  const [job, setJob]           = useState<Job | null>(null);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<TailoredResult | null>(null);
  const [error, setError]       = useState("");
  const [activeTab, setActiveTab] = useState<"compare" | "keywords">("compare");

  useEffect(() => {
    const p = localStorage.getItem("zg_profile");
    const j = localStorage.getItem("zg_jobs");
    if (!p || !j) { router.push("/"); return; }
    const parsedProfile: Profile = JSON.parse(p);
    const allJobs: Job[] = JSON.parse(j);
    const found = allJobs.find(jj => jj.id === jobId);
    if (!found) { router.push("/dashboard"); return; }
    setProfile(parsedProfile);
    setJob(found);
  }, [jobId, router]);

  const tailorResume = async () => {
    if (!profile || !job) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/tailor-resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, job }),
      });
      if (!res.ok) throw new Error(`Backend error: ${res.status}`);
      const data: TailoredResult = await res.json();
      setResult(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(`Tailoring failed: ${msg}`);
      // Show mock result for demo reliability
      setResult(getMockResult(profile, job));
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!result?.pdf_base64) return;
    const byteStr = atob(result.pdf_base64);
    const arr = new Uint8Array(byteStr.length);
    for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
    const blob = new Blob([arr], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `tailored_resume_${job?.company?.replace(/\s+/g, "_")}.pdf`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (!profile || !job) return (
    <div className="min-h-screen bg-mesh flex items-center justify-center">
      <div className="w-10 h-10 border-2 rounded-full animate-spin"
        style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }} />
    </div>
  );

  const ts = result?.tailored_sections;
  const matchScore = job.score?.match_score ?? 0;
  const scoreColor = matchScore >= 70 ? "#10d9a0" : matchScore >= 45 ? "#f59e0b" : "#ef4444";

  return (
    <main className="min-h-screen bg-mesh">
      {/* Nav */}
      <nav className="sticky top-0 z-50 glass" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="btn-ghost text-sm py-2 px-4 no-underline" id="back-btn">
              ← Dashboard
            </Link>
            <span className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Resume Tailoring · <span style={{ color: "var(--accent-secondary)" }}>{job.title}</span>
            </span>
          </div>
          {result && (
            <button onClick={downloadPDF} className="btn-primary text-sm py-2.5 px-5" id="download-btn">
              <span>⬇ Download PDF</span>
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Job info banner */}
        <div className="card p-5 mb-6 animate-slide-up flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(108,99,255,0.2), rgba(167,139,250,0.1))", border: "1px solid var(--border)" }}>
            {job.company[0]}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>{job.title}</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{job.company} · {job.location}</p>
          </div>
          {job.score && (
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: scoreColor }}>{matchScore}%</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Match Score</div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" id="error-banner"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }}>
            ⚠️ {error} — Showing demo preview.
          </div>
        )}

        {/* Tab switcher */}
        {result && (
          <div className="flex gap-2 mb-6">
            {(["compare", "keywords"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                id={`tab-${t}`}
                className="text-sm px-5 py-2.5 rounded-xl font-medium transition-all duration-200"
                style={{
                  background: activeTab === t ? "var(--accent-primary)" : "rgba(255,255,255,0.04)",
                  color: activeTab === t ? "#fff" : "var(--text-secondary)",
                  border: `1px solid ${activeTab === t ? "transparent" : "var(--border-subtle)"}`,
                }}>
                {t === "compare" ? "📄 Side-by-Side" : "🎯 ATS Keywords"}
              </button>
            ))}
          </div>
        )}

        {/* CTA before tailoring */}
        {!result && (
          <div className="text-center py-16 animate-slide-up">
            <div className="text-6xl mb-4 animate-float">✨</div>
            <h3 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Tailor Your Resume for This Role
            </h3>
            <p className="text-base mb-8 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
              AI will rewrite your summary, reorder skills, inject ATS keywords, and generate a job-specific PDF.
            </p>
            <button onClick={tailorResume} disabled={loading}
              className="btn-primary text-lg py-4 px-10 disabled:opacity-60" id="tailor-start-btn">
              <span>{loading ? "✨ Tailoring your resume…" : "✨ Tailor My Resume"}</span>
            </button>
            {loading && (
              <div className="mt-8 flex flex-col items-center gap-3 animate-fade-in">
                <div className="flex gap-2">
                  {["Analyzing job description", "Rewriting sections", "Injecting ATS keywords", "Generating PDF"].map((s, i) => (
                    <div key={s} className="flex flex-col items-center gap-1">
                      <div className="w-2 h-2 rounded-full animate-bounce"
                        style={{ background: "var(--accent-primary)", animationDelay: `${i * 0.15}s` }} />
                    </div>
                  ))}
                </div>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Gemini is optimizing your resume…
                </p>
              </div>
            )}
          </div>
        )}

        {/* Side-by-side compare */}
        {result && activeTab === "compare" && ts && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            {/* Original */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2 h-2 rounded-full" style={{ background: "#6b6b8a" }} />
                <h3 className="font-semibold text-sm uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Original Profile
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{profile.name}</p>
                  <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    {profile.roles?.join(", ")} · {profile.location}
                  </p>
                </div>
                <SectionBlock title="Skills">
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills?.map(s => (
                      <span key={s} className="text-xs px-2.5 py-1 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </SectionBlock>
                <SectionBlock title="Experience">
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {profile.experience_years} year{profile.experience_years !== 1 ? "s" : ""} of experience
                  </p>
                </SectionBlock>
              </div>
            </div>

            {/* Tailored */}
            <div className="card p-6 glow-purple">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: "#10d9a0" }} />
                <h3 className="font-semibold text-sm uppercase tracking-wider" style={{ color: "#10d9a0" }}>
                  AI-Tailored for {job.company}
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{ts.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{ts.contact_line}</p>
                </div>
                {ts.summary && (
                  <SectionBlock title="Summary ✨">
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{ts.summary}</p>
                  </SectionBlock>
                )}
                <SectionBlock title="Skills (Reordered)">
                  <div className="flex flex-wrap gap-1.5">
                    {ts.skills?.map(s => (
                      <span key={s} className="text-xs px-2.5 py-1 rounded-lg font-medium"
                        style={{ background: "rgba(108,99,255,0.12)", color: "var(--accent-secondary)", border: "1px solid rgba(108,99,255,0.25)" }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </SectionBlock>
                {ts.experience?.length > 0 && (
                  <SectionBlock title="Experience">
                    {ts.experience.map((exp, i) => (
                      <div key={i} className="mb-3 last:mb-0">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{exp.title} — {exp.company}</p>
                        <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{exp.duration}</p>
                        {exp.bullets?.slice(0, 2).map((b, j) => (
                          <p key={j} className="text-xs pl-3 relative" style={{ color: "var(--text-secondary)" }}>
                            <span className="absolute left-0" style={{ color: "var(--accent-primary)" }}>•</span> {b}
                          </p>
                        ))}
                      </div>
                    ))}
                  </SectionBlock>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ATS keywords tab */}
        {result && activeTab === "keywords" && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="card p-6">
              <h3 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                🎯 ATS Keywords Injected
              </h3>
              <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
                These keywords from the job description were woven into your tailored resume.
              </p>
              <div className="flex flex-wrap gap-2">
                {(result.ats_keywords?.length ? result.ats_keywords : ["No keywords extracted"]).map((kw, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-xl text-sm font-medium"
                    style={{ background: "rgba(16,217,160,0.1)", color: "#10d9a0", border: "1px solid rgba(16,217,160,0.25)" }}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>{title}</p>
      {children}
    </div>
  );
}

function getMockResult(profile: Profile, job: Job): TailoredResult {
  return {
    tailored_sections: {
      name: profile.name,
      contact_line: `${profile.location} · github.com/${profile.name?.split(" ")[0]?.toLowerCase()}`,
      summary: `Results-driven ${profile.roles?.[0] ?? "professional"} with ${profile.experience_years}+ years of experience, now targeting ${job.title} at ${job.company}. Proven ability to deliver scalable solutions aligned with modern engineering standards.`,
      skills: [...(profile.skills ?? [])].sort(() => Math.random() - 0.5),
      experience: [],
      education: [],
      projects: [],
      ats_keywords_injected: (job.description ?? "").split(" ").filter(w => w.length > 5).slice(0, 12),
    },
    pdf_base64: "",
    ats_keywords: (job.description ?? "").split(" ").filter(w => w.length > 5).slice(0, 12),
  };
}

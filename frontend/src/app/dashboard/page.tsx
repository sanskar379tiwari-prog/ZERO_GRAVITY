"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Score {
  match_score: number;
  skill_overlap: number;
  experience_overlap: number;
  location_match: number;
  remote_compatibility: number;
  ats_keyword_similarity: number;
  salary_match: number;
  job_freshness: number;
  estimated_shortlist_probability: number;
  reasoning: string[];
}

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary_min: number;
  salary_max: number;
  description: string;
  posted_at: string;
  url: string;
  score?: Score;
}

interface Profile {
  name: string;
  skills: string[];
  experience_years: number;
  roles: string[];
  location: string;
  salary_expectation: { min: number; max: number };
  remote_preference: string;
}

function ScoreBar({ label, value, color = "#6c63ff" }: { label: string; value: number; color?: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setWidth(value), 100); return () => clearTimeout(t); }, [value]);
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
        <span className="text-xs font-semibold" style={{ color }}>{value}%</span>
      </div>
      <div className="score-bar">
        <div className="score-bar-fill" style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? "#10d9a0" : score >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx="28" cy="28" r="24" fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${(score / 100) * 150.8} 150.8`}
          strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <span className="text-sm font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

function JobCard({ job, index }: { job: Job; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const score = job.score;
  const matchScore = score?.match_score ?? 0;
  const scoreColor = matchScore >= 70 ? "#10d9a0" : matchScore >= 45 ? "#f59e0b" : "#ef4444";

  const salary =
    job.salary_min && job.salary_max
      ? `$${(job.salary_min / 1000).toFixed(0)}k – $${(job.salary_max / 1000).toFixed(0)}k`
      : "Salary not listed";

  const daysAgo = job.posted_at
    ? Math.max(0, Math.floor((Date.now() - new Date(job.posted_at).getTime()) / 86400000))
    : null;

  return (
    <div
      className="card p-6 animate-slide-up cursor-pointer"
      style={{ animationDelay: `${index * 0.06}s` }}
      onClick={() => setExpanded(!expanded)}
      id={`job-card-${job.id}`}
    >
      <div className="flex items-start gap-4">
        {/* Company logo placeholder */}
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
          style={{ background: "linear-gradient(135deg, rgba(108,99,255,0.2), rgba(167,139,250,0.1))", border: "1px solid var(--border)" }}>
          {job.company[0]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-base leading-tight" style={{ color: "var(--text-primary)" }}>{job.title}</h3>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{job.company}</p>
            </div>
            {score && <ScoreRing score={matchScore} />}
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <span className="badge" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
              📍 {job.location}
            </span>
            {job.remote && <span className="badge badge-applied">🌐 Remote</span>}
            <span className="badge" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
              💰 {salary}
            </span>
            {daysAgo !== null && (
              <span className="badge" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}>
                🕐 {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
              </span>
            )}
          </div>

          {score && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {score.reasoning.slice(0, 2).map((r, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-lg"
                  style={{ background: "rgba(108,99,255,0.08)", color: "var(--accent-secondary)", border: "1px solid rgba(108,99,255,0.15)" }}>
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-5 pt-5 animate-fade-in" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          {score && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <ScoreBar label="Skill Overlap"    value={score.skill_overlap}          color={scoreColor} />
              <ScoreBar label="ATS Similarity"   value={score.ats_keyword_similarity} color="#a78bfa" />
              <ScoreBar label="Location Match"   value={score.location_match}         color="#10d9a0" />
              <ScoreBar label="Salary Match"     value={score.salary_match}           color="#f59e0b" />
              <ScoreBar label="Experience Fit"   value={score.experience_overlap}     color="#6c63ff" />
              <ScoreBar label="Job Freshness"    value={score.job_freshness}          color="#10d9a0" />
            </div>
          )}

          <p className="text-sm mb-4 line-clamp-4" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
            {job.description}
          </p>

          <div className="flex gap-3 flex-wrap">
            <Link href={`/resume-compare/${job.id}`}
              onClick={(e) => e.stopPropagation()}
              className="btn-primary text-sm py-2.5 px-5 inline-block no-underline"
              id={`tailor-btn-${job.id}`}>
              <span>✨ Tailor Resume</span>
            </Link>
            <a href={job.url} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="btn-ghost text-sm py-2.5 px-5 inline-block no-underline"
              id={`apply-btn-${job.id}`}>
              Apply Now ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [filter, setFilter]   = useState<"all" | "remote" | "high">("all");
  const [search, setSearch]   = useState("");

  useEffect(() => {
    const p = localStorage.getItem("zg_profile");
    const j = localStorage.getItem("zg_jobs");
    if (!p || !j) { router.push("/"); return; }
    setProfile(JSON.parse(p));
    setJobs(JSON.parse(j));
  }, [router]);

  const filtered = jobs.filter((j) => {
    if (filter === "remote" && !j.remote) return false;
    if (filter === "high"   && (j.score?.match_score ?? 0) < 60) return false;
    const q = search.toLowerCase();
    if (q && !j.title.toLowerCase().includes(q) && !j.company.toLowerCase().includes(q)) return false;
    return true;
  });

  const avgScore = jobs.length
    ? Math.round(jobs.reduce((sum, j) => sum + (j.score?.match_score ?? 0), 0) / jobs.length)
    : 0;

  if (!profile) return (
    <div className="min-h-screen bg-mesh flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 rounded-full animate-spin mx-auto mb-4"
          style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }} />
        <p style={{ color: "var(--text-muted)" }}>Loading your dashboard…</p>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-mesh">
      {/* Nav */}
      <nav className="sticky top-0 z-50 glass" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold gradient-text" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Zero Gravity
          </span>
          <div className="flex items-center gap-4">
            <Link href="/applications" className="text-sm btn-ghost py-2 px-4 no-underline" id="nav-applications">
              My Applications
            </Link>
            <button onClick={() => router.push("/")} className="text-sm btn-ghost py-2 px-4" id="nav-new-search">
              New Search
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Profile + stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Profile card */}
          <div className="md:col-span-2 card p-6 animate-slide-up">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)" }}>
                {profile.name?.[0] ?? "?"}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{profile.name}</h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {profile.roles?.join(", ")} · {profile.experience_years}y exp · {profile.location}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {profile.skills?.slice(0, 8).map((s) => (
                    <span key={s} className="text-xs px-2.5 py-1 rounded-lg font-medium"
                      style={{ background: "rgba(108,99,255,0.12)", color: "var(--accent-secondary)", border: "1px solid rgba(108,99,255,0.2)" }}>
                      {s}
                    </span>
                  ))}
                  {(profile.skills?.length ?? 0) > 8 && (
                    <span className="text-xs px-2.5 py-1 rounded-lg" style={{ color: "var(--text-muted)" }}>
                      +{profile.skills.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
            {[
              { label: "Jobs Found",   value: jobs.length,   icon: "🔍", color: "#6c63ff" },
              { label: "Avg Match",    value: `${avgScore}%`, icon: "⚡", color: avgScore >= 60 ? "#10d9a0" : "#f59e0b" },
            ].map((stat) => (
              <div key={stat.label} className="card p-4 animate-slide-up text-center">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters + search */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input id="job-search" className="input-dark max-w-xs" placeholder="🔍  Search jobs…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex gap-2">
            {(["all", "remote", "high"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                id={`filter-${f}`}
                className="text-sm px-4 py-2 rounded-xl font-medium transition-all duration-200"
                style={{
                  background: filter === f ? "var(--accent-primary)" : "rgba(255,255,255,0.04)",
                  color: filter === f ? "#fff" : "var(--text-secondary)",
                  border: `1px solid ${filter === f ? "transparent" : "var(--border-subtle)"}`,
                }}>
                {f === "all" ? "All Jobs" : f === "remote" ? "Remote" : "Best Match"}
              </button>
            ))}
          </div>
          <span className="text-sm ml-auto" style={{ color: "var(--text-muted)" }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Job cards */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-20 card">
              <p className="text-4xl mb-3">🚀</p>
              <p className="font-semibold" style={{ color: "var(--text-secondary)" }}>No jobs match your filter</p>
              <button onClick={() => { setFilter("all"); setSearch(""); }} className="btn-ghost mt-4 text-sm py-2 px-5">
                Clear Filters
              </button>
            </div>
          ) : (
            filtered.map((job, i) => <JobCard key={job.id} job={job} index={i} />)
          )}
        </div>
      </div>
    </main>
  );
}

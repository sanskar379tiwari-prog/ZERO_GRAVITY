"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Status = "Applied" | "Pending" | "Interview" | "Rejected";

interface Application {
  id: string;
  job_title: string;
  company: string;
  location: string;
  applied_date: string;
  status: Status;
  match_score: number;
  url: string;
  next_action?: string;
}

const MOCK_APPLICATIONS: Application[] = [
  { id: "app-001", job_title: "Junior Backend Engineer",  company: "Orbit Labs",   location: "Remote",           applied_date: "2026-05-06", status: "Interview", match_score: 82, url: "#", next_action: "Interview on May 12 @ 3 PM" },
  { id: "app-002", job_title: "AI Product Analyst",       company: "Zero Gravity", location: "San Francisco, CA", applied_date: "2026-05-05", status: "Pending",   match_score: 71, url: "#", next_action: "Awaiting response" },
  { id: "app-003", job_title: "Full Stack Developer",     company: "Nova Systems", location: "Remote",           applied_date: "2026-05-03", status: "Applied",   match_score: 68, url: "#" },
  { id: "app-004", job_title: "Data Engineer",            company: "Quantum Data", location: "New York, NY",     applied_date: "2026-04-29", status: "Rejected",  match_score: 44, url: "#" },
];

const STATUS_CONFIG: Record<Status, { label: string; cls: string; icon: string }> = {
  Applied:   { label: "Applied",   cls: "badge-applied",   icon: "📨" },
  Pending:   { label: "Pending",   cls: "badge-pending",   icon: "⏳" },
  Interview: { label: "Interview", cls: "badge-interview", icon: "🎯" },
  Rejected:  { label: "Rejected",  cls: "badge-rejected",  icon: "❌" },
};

export default function ApplicationsPage() {
  const router = useRouter();
  const [apps, setApps]       = useState<Application[]>(MOCK_APPLICATIONS);
  const [filterStatus, setFilterStatus] = useState<Status | "All">("All");

  // Merge real applied jobs from localStorage if present
  useEffect(() => {
    const raw = localStorage.getItem("zg_applications");
    if (raw) {
      try {
        const saved: Application[] = JSON.parse(raw);
        setApps([...saved, ...MOCK_APPLICATIONS]);
      } catch { /* ignore */ }
    }
  }, []);

  const counts = {
    All:       apps.length,
    Applied:   apps.filter(a => a.status === "Applied").length,
    Pending:   apps.filter(a => a.status === "Pending").length,
    Interview: apps.filter(a => a.status === "Interview").length,
    Rejected:  apps.filter(a => a.status === "Rejected").length,
  };

  const visible = filterStatus === "All" ? apps : apps.filter(a => a.status === filterStatus);

  return (
    <main className="min-h-screen bg-mesh">
      {/* Nav */}
      <nav className="sticky top-0 z-50 glass" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold gradient-text no-underline" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Zero Gravity
          </Link>
          <Link href="/dashboard" className="btn-ghost text-sm py-2 px-4 no-underline" id="nav-back-dashboard">
            ← Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>Application Tracker</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Track the status of all your job applications</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {(["Interview", "Pending", "Applied", "Rejected"] as Status[]).map((s) => (
            <div key={s} className="card p-4 text-center animate-slide-up cursor-pointer"
              onClick={() => setFilterStatus(s)}
              style={{ borderColor: filterStatus === s ? "var(--accent-primary)" : "transparent" }}>
              <div className="text-2xl font-bold mb-1" style={{
                color: s === "Interview" ? "#10d9a0" : s === "Pending" ? "#f59e0b" : s === "Applied" ? "#a78bfa" : "#ef4444"
              }}>{counts[s]}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {(["All", "Interview", "Pending", "Applied", "Rejected"] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              id={`status-tab-${s.toLowerCase()}`}
              className="text-sm px-4 py-2 rounded-xl font-medium transition-all duration-200"
              style={{
                background: filterStatus === s ? "var(--accent-primary)" : "rgba(255,255,255,0.04)",
                color: filterStatus === s ? "#fff" : "var(--text-secondary)",
                border: `1px solid ${filterStatus === s ? "transparent" : "var(--border-subtle)"}`,
              }}>
              {s} {counts[s as keyof typeof counts]}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card overflow-hidden animate-slide-up">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {["Job", "Company", "Location", "Applied", "Status", "Match", "Next Action"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((app, i) => {
                  const cfg = STATUS_CONFIG[app.status];
                  const scoreColor = app.match_score >= 70 ? "#10d9a0" : app.match_score >= 45 ? "#f59e0b" : "#ef4444";
                  return (
                    <tr key={app.id}
                      id={`app-row-${app.id}`}
                      className="transition-colors duration-150"
                      style={{
                        borderBottom: i < visible.length - 1 ? "1px solid var(--border-subtle)" : "none",
                        animationDelay: `${i * 0.05}s`,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(108,99,255,0.04)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td className="px-4 py-4">
                        <span className="font-medium" style={{ color: "var(--text-primary)" }}>{app.job_title}</span>
                      </td>
                      <td className="px-4 py-4" style={{ color: "var(--text-secondary)" }}>{app.company}</td>
                      <td className="px-4 py-4" style={{ color: "var(--text-muted)" }}>{app.location}</td>
                      <td className="px-4 py-4" style={{ color: "var(--text-muted)" }}>
                        {new Date(app.applied_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge ${cfg.cls}`}>{cfg.icon} {cfg.label}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-bold" style={{ color: scoreColor }}>{app.match_score}%</span>
                      </td>
                      <td className="px-4 py-4 text-xs" style={{ color: "var(--text-muted)", maxWidth: 180 }}>
                        {app.next_action ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {visible.length === 0 && (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">📭</p>
                <p style={{ color: "var(--text-secondary)" }}>No applications in this category</p>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-center mt-6" style={{ color: "var(--text-muted)" }}>
          Demo data shown · Real application tracking syncs with backend
        </p>
      </div>
    </main>
  );
}

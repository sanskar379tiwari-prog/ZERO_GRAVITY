"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listApplications, updateApplicationStatus } from "@/lib/api";
import type { ApplicationRecord, ApplicationStatus } from "@/types/application";

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; cls: string; icon: string }> = {
  Applied:   { label: "Applied",   cls: "badge-applied",   icon: "📨" },
  Pending:   { label: "Pending",   cls: "badge-pending",   icon: "⏳" },
  Interview: { label: "Interview", cls: "badge-interview", icon: "🎯" },
  Rejected:  { label: "Rejected",  cls: "badge-rejected",  icon: "❌" },
};

function ApplicationRow({ 
  app, 
  index, 
  isLast, 
  updatingId, 
  onStatusChange 
}: { 
  app: ApplicationRecord, 
  index: number, 
  isLast: boolean, 
  updatingId: string,
  onStatusChange: (id: string, s: ApplicationStatus) => void 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const cfg = STATUS_CONFIG[app.status];
  const rowKey = app.app_id || `app-${index}`;

  return (
    <>
      <tr 
        id={`app-row-${app.app_id}`}
        className="transition-colors duration-150"
        style={{
          borderBottom: !isExpanded && !isLast ? "1px solid rgba(148,163,184,0.15)" : "none",
          animationDelay: `${index * 0.05}s`,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(34,211,238,0.05)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
        <td className="px-4 py-4">
          <span className="font-medium">{app.job_title}</span>
        </td>
        <td className="px-4 py-4 text-slate-300/85">{app.company}</td>
        <td className="px-4 py-4 text-slate-400">
          {new Date(app.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </td>
        <td className="px-4 py-4">
          <span className={`badge ${cfg.cls}`}>{cfg.icon} {cfg.label}</span>
        </td>
        <td className="px-4 py-4 flex items-center gap-2">
          <select
            value={app.status}
            disabled={updatingId === app.app_id}
            onChange={(e) => onStatusChange(app.app_id, e.target.value as ApplicationStatus)}
            className="rounded-lg border border-slate-600/70 bg-slate-900/45 px-2.5 py-1 text-xs text-slate-100"
          >
            {(["Applied", "Pending", "Interview", "Rejected"] as ApplicationStatus[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          
          {(app.outreach_draft || app.tailored_resume) && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[10px] uppercase font-bold text-cyan-400 hover:text-cyan-300 transition"
            >
              {isExpanded ? "Hide" : "View"}
            </button>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-slate-900/30 border-b border-slate-700/40">
          <td colSpan={5} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
              {app.outreach_draft && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase text-slate-500 tracking-widest">Outreach Draft</h4>
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                    <p className="text-xs font-semibold text-slate-400 mb-1">Subject: {app.outreach_draft.subject}</p>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{app.outreach_draft.email_body}</p>
                  </div>
                </div>
              )}
              {app.tailored_resume && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase text-slate-500 tracking-widest">Tailored Resume</h4>
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                    <p className="text-sm text-slate-300 italic mb-2">Resume has been tailored for this role.</p>
                    <p className="text-xs text-slate-400 font-semibold mb-1">Injected Keywords:</p>
                    <div className="flex flex-wrap gap-1">
                      {(app.tailored_resume.ats_keywords_injected || []).slice(0, 8).map((kw: string) => (
                        <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-200 border border-cyan-500/20">{kw}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<ApplicationRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | "All">("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await listApplications();
        setApps(data);
      } catch (err) {
        console.error(err);
        setError("Could not load applications.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const counts = {
    All:       apps.length,
    Applied:   apps.filter(a => a.status === "Applied").length,
    Pending:   apps.filter(a => a.status === "Pending").length,
    Interview: apps.filter(a => a.status === "Interview").length,
    Rejected:  apps.filter(a => a.status === "Rejected").length,
  };

  const visible = filterStatus === "All" ? apps : apps.filter(a => a.status === filterStatus);

  async function handleStatusChange(appId: string, status: ApplicationStatus) {
    if (!appId) return;
    try {
      setUpdatingId(appId);
      const updated = await updateApplicationStatus(appId, status);
      setApps((prev) => prev.map((app) => (app.app_id === appId ? updated : app)));
    } catch (err) {
      console.error(err);
      setError("Status update failed.");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#041423] text-slate-100">
      <nav className="sticky top-0 z-50 backdrop-blur" style={{ borderBottom: "1px solid rgba(148,163,184,0.2)", background: "rgba(6,26,44,0.85)" }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-semibold no-underline text-slate-100">
            Zero Gravity
          </Link>
          <Link href="/dashboard" className="rounded-full border border-cyan-200/35 bg-slate-900/45 px-4 py-2 text-sm no-underline text-cyan-100 transition hover:bg-slate-800/80">
            ← Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8 animate-slide-up">
          <h1 className="text-3xl font-semibold">Application Tracker</h1>
          <p className="text-sm mt-1 text-slate-300/75">Connected to backend application logs</p>
        </div>

        {loading && <p className="mb-5 text-sm text-slate-300/70">Loading applications...</p>}
        {error && <p className="mb-5 rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {(["Interview", "Pending", "Applied", "Rejected"] as ApplicationStatus[]).map((s) => (
            <div key={s} className="rounded-2xl border border-slate-700/60 bg-[#061a2c]/85 p-4 text-center animate-slide-up cursor-pointer"
              onClick={() => setFilterStatus(s)}
              style={{ borderColor: filterStatus === s ? "rgba(34,211,238,0.8)" : "rgba(51,65,85,0.7)" }}>
              <div className="text-2xl font-bold mb-1" style={{
                color: s === "Interview" ? "#10d9a0" : s === "Pending" ? "#f59e0b" : s === "Applied" ? "#a78bfa" : "#ef4444"
              }}>{counts[s]}</div>
              <div className="text-xs text-slate-400">{s}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap mb-6">
          {(["All", "Interview", "Pending", "Applied", "Rejected"] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="text-sm px-4 py-2 rounded-xl font-medium transition-all duration-200"
              style={{
                background: filterStatus === s ? "rgba(6,182,212,0.75)" : "rgba(255,255,255,0.04)",
                color: filterStatus === s ? "#fff" : "var(--text-secondary)",
                border: `1px solid ${filterStatus === s ? "transparent" : "rgba(148,163,184,0.25)"}`,
              }}>
              {s} {counts[s as keyof typeof counts]}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-[#061a2c]/85 overflow-hidden animate-slide-up">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(148,163,184,0.2)" }}>
                  {["Job", "Company", "Applied", "Status", "Update"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "rgba(226,232,240,0.75)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((app, i) => (
                  <ApplicationRow 
                    key={app.app_id || i}
                    app={app}
                    index={i}
                    isLast={i === visible.length - 1}
                    updatingId={updatingId}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </tbody>
            </table>

            {visible.length === 0 && (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">📭</p>
                <p className="text-slate-300/85">No applications in this category</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

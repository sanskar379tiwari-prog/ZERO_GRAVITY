"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listApplications, updateApplicationStatus } from "@/lib/api";
import type { ApplicationRecord, ApplicationStatus } from "@/types/application";

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; bg: string; border: string; icon: string }> = {
  Applied:   { label: "Applied",   color: "text-[#323232]", bg: "bg-white",  border: "border-[#323232]", icon: "📨" },
  Pending:   { label: "Pending",   color: "text-[#323232]", bg: "bg-white",  border: "border-[#323232]", icon: "⏳" },
  Interview: { label: "Interview", color: "text-[#323232]", bg: "bg-white",  border: "border-[#323232]", icon: "🎯" },
  Rejected:  { label: "Rejected",  color: "text-[#323232]", bg: "bg-white",  border: "border-[#323232]", icon: "❌" },
};

const STAT_COLORS: Record<ApplicationStatus, string> = {
  Interview: "text-[#2d8cf0]",
  Pending:   "text-[#ff9900]",
  Applied:   "text-[#323232]",
  Rejected:  "text-[#ff4d4f]",
};

function ApplicationRow({ 
  app, 
  index, 
  updatingId, 
  onStatusChange 
}: { 
  app: ApplicationRecord, 
  index: number, 
  isLast: boolean, 
  updatingId: string,
  onStatusChange: (id: string, s: ApplicationStatus) => void 
}) {
  const cfg = STATUS_CONFIG[app.status];

  return (
    <tr 
      id={`app-row-${app.app_id}`}
      className="transition-colors border-b border-[#323232]/10 last:border-0 hover:bg-[#fcfcfc]"
    >
      <td className="px-6 py-5">
        <Link 
          href={`/applications/${app.app_id}`}
          className="font-black text-[#323232] no-underline hover:underline hover:text-[#2d8cf0]"
        >
          {app.job_title}
        </Link>
      </td>
      <td className="px-6 py-5 text-[#666] font-bold">{app.company}</td>
      <td className="px-6 py-5 text-[#999] font-bold">
        {new Date(app.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </td>
      <td className="px-6 py-5">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] text-[10px] font-black uppercase border-2 ${cfg.border} ${cfg.color} ${cfg.bg}`}>
          {cfg.icon} {cfg.label}
        </span>
      </td>
      <td className="px-6 py-5 flex items-center gap-3">
        <select
          value={app.status}
          disabled={updatingId === app.app_id}
          onChange={(e) => onStatusChange(app.app_id, e.target.value as ApplicationStatus)}
          className="neo-select !text-[10px] !py-1 !px-2"
        >
          {(["Applied", "Pending", "Interview", "Rejected"] as ApplicationStatus[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        
        <Link 
          href={`/applications/${app.app_id}`}
          className="text-[10px] uppercase font-black text-[#2d8cf0] no-underline hover:underline whitespace-nowrap"
        >
          Open Assets →
        </Link>
        <button 
          onClick={() => alert("Automated email feature coming soon!")}
          className="text-[10px] uppercase font-black bg-[#323232] text-white px-3 py-1 rounded-[3px] hover:bg-black transition-colors"
        >
          Apply
        </button>
      </td>
    </tr>
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
    <main className="min-h-screen bg-[#fafafa] text-[#323232]">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-10 border-b-2 border-[#323232] pb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-[#323232]">Application Tracker</h1>
              <p className="text-base mt-2 text-[#666] font-bold">Track every application status in real time.</p>
            </div>
            <Link href="/dashboard" className="text-sm font-black uppercase text-[#323232] hover:underline">
              ← Back to Jobs
            </Link>
          </div>
        </div>

        {loading && <p className="mb-5 text-sm text-[#666] font-black uppercase tracking-widest">Loading applications...</p>}
        {error && (
          <div className="mb-6 rounded-[5px] border-2 border-[#323232] bg-white px-5 py-3 text-sm font-black text-[#323232] shadow-[4px_4px_#323232]">
            ⚠️ {error}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {(["Interview", "Pending", "Applied", "Rejected"] as ApplicationStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`minimal-card p-5 text-center cursor-pointer transition-all ${
                filterStatus === s ? 'ring-2 ring-[#2d8cf0] ring-offset-4' : ''
              }`}
            >
              <div className={`text-3xl font-black mb-1 ${STAT_COLORS[s]}`}>
                {counts[s]}
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-[#999]">{s}</div>
            </button>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap mb-8">
          {(["All", "Interview", "Pending", "Applied", "Rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              id={`status-tab-${s.toLowerCase()}`}
              className={`text-sm px-5 py-2.5 rounded-[5px] font-black transition-all duration-200 border-2 ${
                filterStatus === s
                  ? 'bg-[#323232] text-white border-[#323232] shadow-[3px_3px_#000]'
                  : 'bg-white text-[#666] border-[#323232] hover:bg-[#f0f0f0]'
              }`}
            >
              {s} {counts[s as keyof typeof counts]}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="minimal-card overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#323232]">
                  {["Job", "Company", "Applied", "Status", "Update"].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[#999]">
                      {h}
                    </th>
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
              <div className="text-center py-20">
                <p className="text-4xl mb-4">📭</p>
                <p className="text-[#999] font-black uppercase tracking-widest">No applications in this category</p>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-center mt-8 text-[#999] font-black uppercase tracking-widest">
          Every status change updates backend state in real time.
        </p>
      </div>
    </main>
  );
}

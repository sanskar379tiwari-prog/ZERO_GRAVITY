"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createApplication, draftOutreachEmail, fetchMatchedJobs } from "@/lib/api";
import { JobMatch } from "@/types/job";
import { UiverseInput } from "@/components/UiverseInput";
import { Loader } from "@/components/Loader";

interface Profile {
  name?: string;
  skills?: string[];
  roles?: string[];
  location?: string;
  [key: string]: unknown;
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<JobMatch[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyJobId, setBusyJobId] = useState("");
  const [toast, setToast] = useState("");
  const [draftForJobId, setDraftForJobId] = useState("");
  const [draftEmail, setDraftEmail] = useState<{ subject: string; email_body: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadJobs() {
      try {
        const rawProfile = localStorage.getItem("zg_profile");
        if (!rawProfile) {
          throw new Error("Missing profile. Please run onboarding first.");
        }

        const profileData = JSON.parse(rawProfile) as Profile;
        setProfile(profileData);
        
        const savedJobs = localStorage.getItem("zg_matched_jobs");
        if (savedJobs) {
          const parsedJobs = JSON.parse(savedJobs);
          if (parsedJobs && parsedJobs.length > 0) {
            setJobs(parsedJobs);
            setLoading(false);
            return;
          }
        }

        const data = await fetchMatchedJobs(profileData);
        setJobs(data);
        localStorage.setItem("zg_matched_jobs", JSON.stringify(data));
      } catch (err) {
        console.error(err);
        setError("Could not load matched jobs right now.");
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !profile) return;
    setLoading(true);
    try {
      const data = await fetchMatchedJobs(profile, searchQuery);
      setJobs(data);
      localStorage.setItem("zg_matched_jobs", JSON.stringify(data));
    } catch (err) {
      console.error(err);
      setToast("Search failed.");
    } finally {
      setLoading(false);
    }
  };

  async function handleTrack(job: JobMatch) {
    try {
      setBusyJobId(job.job_id);
      await createApplication({
        job_id: job.job_id,
        job_title: job.title,
        company: job.company,
        profile_name: String(profile?.name ?? "Candidate"),
        status: "Applied",
      });
      setToast("Application added to tracker.");
    } catch (err) {
      console.error(err);
      setToast("Could not track right now.");
    } finally {
      setBusyJobId("");
    }
  }

  async function handleDraft(job: JobMatch) {
    try {
      setBusyJobId(job.job_id);
      const rawProfile = localStorage.getItem("zg_profile");
      if (!rawProfile) throw new Error("Profile missing");
      const parsedProfile = JSON.parse(rawProfile) as Record<string, unknown>;
      const draft = await draftOutreachEmail(parsedProfile, job);
      setDraftForJobId(job.job_id);
      setDraftEmail({ subject: draft.subject, email_body: draft.email_body });
    } catch (err) {
      console.error(err);
      setToast("Draft generation failed.");
    } finally {
      setBusyJobId("");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6 text-slate-900">
        <Loader message="Orchestrating High-Fidelity Job Matches..." />
        <p className="mt-4 text-sm text-slate-500 max-w-md text-center">
          Our AI is currently performing semantic analysis and ATS scoring across multiple sources to find your perfect fit.
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#fafafa] p-12 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fafafa] p-6 text-slate-900">
      <div className="mx-auto mb-12 flex max-w-5xl flex-wrap items-end justify-between gap-6 border-b border-slate-200 pb-8">
        <div className="flex-1 min-w-[300px]">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Matched Jobs</h1>
          <p className="mt-2 text-base text-slate-500">Real-time semantic scoring and orchestration.</p>
          
          <div className="mt-6">
            <UiverseInput 
              placeholder="Search for roles (e.g. React Developer)..."
              value={searchQuery}
              onChange={setSearchQuery}
              buttonText="Search"
              onAction={handleSearch}
              className="max-w-md"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/applications"
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Applications
          </Link>
          <Link
            href="/"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            New Search
          </Link>
        </div>
      </div>

      {toast && (
        <div className="mx-auto mb-8 max-w-5xl rounded-xl border border-purple-100 bg-purple-50 px-5 py-3 text-sm font-medium text-purple-700 animate-in fade-in slide-in-from-top-4">
          {toast}
        </div>
      )}

      <div className="mx-auto space-y-6 max-w-5xl">
      {jobs.map((job, idx) => (
        <div key={job.job_id || `job-${idx}`} className="minimal-card p-8 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-slate-900">{job.title}</h2>
              <p className="text-base text-slate-500 font-medium">
                {job.company} • {job.location} • <span className="text-purple-600">{job.source}</span>
              </p>
            </div>
            <div className="text-right">
              <div className="inline-flex flex-col items-end">
                <span className="text-3xl font-black text-slate-900">{job.match_score}%</span>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Match Score</span>
              </div>
              <div className="mt-2 flex justify-end gap-3 text-[11px] font-bold uppercase tracking-tight text-slate-400">
                <span className="bg-slate-50 px-2 py-0.5 rounded">Semantic: {Math.round((job.semantic_score || 0) * 100)}%</span>
                <span className="bg-slate-50 px-2 py-0.5 rounded">ATS: {Math.round((job.ats_score || 0) * 100)}%</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {Array.isArray(job.matched_skills) && job.matched_skills.length > 0 ? (
              job.matched_skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200/50"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">No technical skills listed</span>
            )}
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-8 pt-8 border-t border-slate-100">
            <div>
              <p className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">Core Reasoning</p>
              <ul className="space-y-2">
                {Array.isArray(job.reasoning) && job.reasoning.length > 0 ? (
                  job.reasoning.map((reason, rIdx) => (
                    <li key={rIdx} className="flex gap-3 text-sm text-slate-600 leading-relaxed">
                      <span className="text-purple-500 font-bold">•</span>
                      {reason}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-slate-400 italic">Analysis pending for this role.</li>
                )}
              </ul>
            </div>
            
            <div className="flex flex-col justify-end gap-3">
              <div className="flex gap-3">
                <Link
                  href={`/resume-compare/${encodeURIComponent(job.job_id || (job as any).id)}`}
                  className="flex-1 text-center rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
                >
                  Tailor Resume
                </Link>
                <button
                  onClick={() => handleDraft(job)}
                  disabled={busyJobId === job.job_id}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {busyJobId === job.job_id ? "Generating..." : "Draft Email"}
                </button>
              </div>
              <button
                onClick={() => handleTrack(job)}
                disabled={busyJobId === job.job_id}
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {busyJobId === job.job_id ? "Saving..." : "Track Application"}
              </button>
            </div>
          </div>

          {draftForJobId === job.job_id && draftEmail && (
            <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Subject Line</p>
              <p className="text-sm font-bold text-slate-900 mb-4">{draftEmail.subject}</p>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Email Body</p>
              <div className="whitespace-pre-wrap text-sm text-slate-600 leading-relaxed bg-white p-4 rounded-xl border border-slate-100">
                {draftEmail.email_body}
              </div>
            </div>
          )}
        </div>
      ))}
      </div>
    </main>
  );
}

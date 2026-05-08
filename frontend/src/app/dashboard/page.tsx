"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createApplication, draftOutreachEmail, fetchMatchedJobs } from "@/lib/api";
import { JobMatch } from "@/types/job";

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

  useEffect(() => {
    async function loadJobs() {
      try {
        const rawProfile = localStorage.getItem("zg_profile");
        if (!rawProfile) {
          throw new Error("Missing profile. Please run onboarding first.");
        }

        const profileData = JSON.parse(rawProfile) as Profile;
        setProfile(profileData);
        
        // Try to get already scored jobs from localStorage first (from the onboarding pipeline)
        const savedJobs = localStorage.getItem("zg_jobs");
        if (savedJobs) {
          const parsedJobs = JSON.parse(savedJobs);
          if (parsedJobs && parsedJobs.length > 0) {
            console.log("Using cached jobs from localStorage");
            setJobs(parsedJobs);
            setLoading(false);
            return;
          }
        }

        // Fallback to fetching if no saved jobs or empty
        console.log("Fetching fresh jobs from API");
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
    return <div className="p-6 text-slate-300">Loading jobs...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-300">{error}</div>;
  }

  return (
    <main className="min-h-screen bg-[#041423] p-6 text-slate-100">
      <div className="mx-auto mb-6 flex max-w-6xl items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Matched Jobs</h1>
          <p className="mt-1 text-sm text-slate-300/80">Real-time backend scoring, outreach, and tracking.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/applications"
            className="rounded-full border border-cyan-200/40 bg-slate-900/45 px-4 py-2 text-sm transition hover:bg-slate-800/80"
          >
            Applications
          </Link>
          <Link
            href="/"
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-white"
          >
            New Search
          </Link>
        </div>
      </div>

      {toast && (
        <div className="mx-auto mb-4 max-w-6xl rounded-xl border border-cyan-300/40 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100">
          {toast}
        </div>
      )}

      <div className="mx-auto space-y-4 max-w-6xl">
      {jobs.map((job) => (
        <div key={job.job_id} className="rounded-2xl border border-slate-700/60 bg-[#061a2c]/85 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">{job.title}</h2>
              <p className="text-sm text-slate-300/70">
                {job.company} • {job.location}
              </p>
            </div>
            <p className="rounded-full bg-cyan-500/15 px-3 py-1 text-sm font-medium text-cyan-200">
              Match Score: {job.match_score}%
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-slate-900">
            {(job.skills_overlap || []).map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm"
              >
                {skill}
              </span>
            ))}
          </div>

          <div className="mt-4">
            <p className="font-medium text-slate-100">Why Matched:</p>

            <ul className="list-disc pl-5 text-sm text-slate-300/85">
              {(job.reasoning || []).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={`/resume-compare/${job.job_id}`}
              className="rounded-full border border-cyan-200/40 bg-slate-900/40 px-4 py-2 text-sm text-cyan-100 transition hover:bg-slate-800/80"
            >
              Tailor Resume
            </Link>
            <button
              onClick={() => handleDraft(job)}
              disabled={busyJobId === job.job_id}
              className="rounded-full border border-slate-500/60 bg-slate-900/35 px-4 py-2 text-sm text-slate-100 transition hover:bg-slate-800/70 disabled:opacity-55"
            >
              {busyJobId === job.job_id ? "Generating..." : "Draft Outreach"}
            </button>
            <button
              onClick={() => handleTrack(job)}
              disabled={busyJobId === job.job_id}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-white disabled:opacity-60"
            >
              {busyJobId === job.job_id ? "Saving..." : "Track Application"}
            </button>
          </div>

          {draftForJobId === job.job_id && draftEmail && (
            <div className="mt-4 rounded-xl border border-slate-700/70 bg-slate-900/45 p-4">
              <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">Draft Subject</p>
              <p className="text-sm text-slate-200">{draftEmail.subject}</p>
              <p className="mb-1 mt-3 text-xs uppercase tracking-wide text-slate-400">Draft Body</p>
              <p className="whitespace-pre-wrap text-sm text-slate-300/90">{draftEmail.email_body}</p>
            </div>
          )}
        </div>
      ))}
      </div>
    </main>
  );
}

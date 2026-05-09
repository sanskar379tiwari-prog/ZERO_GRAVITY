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
      
      // Get the draft if it matches the current job
      const currentDraft = (draftForJobId === job.job_id) ? draftEmail : null;
      
      // Get tailored resume from localStorage if it exists
      let tailoredResume = null;
      const rawResume = localStorage.getItem(`zg_tailored_resume_${job.job_id}`);
      if (rawResume) {
        try { tailoredResume = JSON.parse(rawResume); } catch(e) {}
      }

      await createApplication({
        job_id: job.job_id,
        job_title: job.title,
        company: job.company,
        profile_name: String(profile?.name ?? "Candidate"),
        status: "Applied",
        outreach_draft: currentDraft ? { subject: currentDraft.subject, email_body: currentDraft.email_body } : undefined,
        tailored_resume: tailoredResume || undefined,
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
      <main className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6">
        <Loader message="Orchestrating Job Matches..." />
        <p className="mt-4 text-sm text-[#666] max-w-md text-center">
          Our AI is performing semantic analysis and ATS scoring across multiple sources.
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
          <h1 className="text-4xl font-black tracking-tight text-[#323232]">Matched Jobs</h1>
          <p className="mt-2 text-base text-[#666]">Real-time semantic scoring and orchestration.</p>
          
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
            className="no-underline rounded-[5px] border-2 border-[#323232] bg-white px-5 py-2.5 text-sm font-bold text-[#323232] shadow-[3px_3px_#323232] transition-all hover:shadow-[0px_0px_#323232] hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            Applications
          </Link>
          <Link
            href="/"
            className="no-underline rounded-[5px] border-2 border-[#323232] bg-[#323232] px-5 py-2.5 text-sm font-bold text-white shadow-[3px_3px_#000] transition-all hover:shadow-[0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            New Search
          </Link>
        </div>
      </div>

      {toast && (
        <div className="mx-auto mb-8 max-w-5xl rounded-[5px] border-2 border-[#323232] bg-white px-5 py-3 text-sm font-bold text-[#323232] shadow-[3px_3px_#323232]">
          {toast}
        </div>
      )}

      <div className="mx-auto space-y-6 max-w-5xl">
      {jobs.map((job, idx) => (
        <div key={job.job_id || `job-${idx}`} className="minimal-card p-8 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-[#323232]">{job.title}</h2>
              <p className="text-base text-[#666] font-bold">
                {job.company} • {job.location} • <span className="text-[#2d8cf0]">{job.source}</span>
              </p>
            </div>
            <div className="text-right">
              <div className="inline-flex flex-col items-end">
                <span className="text-4xl font-black text-[#323232]">{job.match_score}%</span>
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#999]">Match Score</span>
              </div>
              <div className="mt-2 flex justify-end gap-3 text-[10px] font-black uppercase tracking-tight text-[#999]">
                <span className="bg-[#f0f0f0] px-2 py-0.5 rounded border border-[#323232]/10">Semantic: {Math.round((job.semantic_score || 0) * 100)}%</span>
                <span className="bg-[#f0f0f0] px-2 py-0.5 rounded border border-[#323232]/10">ATS: {Math.round((job.ats_score || 0) * 100)}%</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {Array.isArray(job.matched_skills) && job.matched_skills.length > 0 ? (
              job.matched_skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-[5px] bg-[#f0f0f0] px-3 py-1.5 text-xs font-black text-[#323232] border-2 border-[#323232]"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs text-[#999] italic font-bold">No technical skills listed</span>
            )}
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-8 pt-8 border-t border-slate-100">
            <div>
              <p className="text-sm font-black text-[#323232] uppercase tracking-wider mb-3">Core Reasoning</p>
              <ul className="space-y-2">
                {Array.isArray(job.reasoning) && job.reasoning.length > 0 ? (
                  job.reasoning.map((reason, rIdx) => (
                    <li key={rIdx} className="flex gap-3 text-sm text-[#666] leading-relaxed font-bold">
                      <span className="text-[#2d8cf0] font-black">•</span>
                      {reason}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-[#999] italic font-bold">Analysis pending for this role.</li>
                )}
              </ul>
            </div>
            
            <div className="flex flex-col justify-end gap-3">
              <div className="flex gap-3">
                <Link
                  href={`/resume-compare/${encodeURIComponent(job.job_id || (job as any).id)}`}
                  className="flex-1 text-center no-underline rounded-[5px] border-2 border-[#323232] bg-white py-3 text-sm font-black text-[#323232] shadow-[3px_3px_#323232] transition-all hover:shadow-[0px_0px_#323232] hover:translate-x-[2px] hover:translate-y-[2px]"
                >
                  Tailor Resume
                </Link>
                <button
                  onClick={() => handleDraft(job)}
                  disabled={busyJobId === job.job_id}
                  className="flex-1 rounded-[5px] border-2 border-[#323232] bg-white py-3 text-sm font-black text-[#323232] shadow-[3px_3px_#323232] transition-all hover:shadow-[0px_0px_#323232] hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50"
                >
                  {busyJobId === job.job_id ? "Generating..." : "Draft Email"}
                </button>
              </div>
              <button
                onClick={() => handleTrack(job)}
                disabled={busyJobId === job.job_id}
                className="w-full rounded-[5px] border-2 border-[#323232] bg-[#323232] py-3 text-sm font-black text-white shadow-[3px_3px_#000] transition-all hover:shadow-[0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50"
              >
                {busyJobId === job.job_id ? "Saving..." : "Track Application"}
              </button>
            </div>
          </div>

          {draftForJobId === job.job_id && draftEmail && (
            <div className="mt-8 rounded-[5px] border-2 border-[#323232] bg-[#fcfcfc] p-6 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)]">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#999]">Subject Line</p>
              <p className="text-sm font-black text-[#323232] mb-4">{draftEmail.subject}</p>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#999]">Email Body</p>
              <div className="whitespace-pre-wrap text-sm text-[#666] font-bold leading-relaxed bg-white p-4 rounded-[5px] border-2 border-[#323232]">
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

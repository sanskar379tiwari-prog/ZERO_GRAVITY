"use client";

import { useEffect, useState } from "react";
import { fetchMatchedJobs } from "@/lib/api";
import { JobMatch } from "@/types/job";

interface Profile {
  roles?: string[];
  location?: string;
  [key: string]: unknown;
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadJobs() {
      try {
        const rawProfile = localStorage.getItem("zg_profile");
        if (!rawProfile) {
          throw new Error("Missing profile. Please run onboarding first.");
        }

        const profile = JSON.parse(rawProfile) as Profile;
        const data = await fetchMatchedJobs(profile);
        setJobs(data);
      } catch (err) {
        console.error(err);
        setError("Could not load matched jobs right now.");
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, []);

  if (loading) {
    return <div className="p-6">Loading jobs...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-4 p-6">
      {jobs.map((job) => (
        <div key={job.job_id} className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold">{job.title}</h2>

          <p className="text-sm text-gray-500">
            {job.company} • {job.location}
          </p>

          <div className="mt-4">
            <p className="font-medium">Match Score: {job.match_score}%</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {job.skills_overlap.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-gray-100 px-3 py-1 text-sm"
              >
                {skill}
              </span>
            ))}
          </div>

          <div className="mt-4">
            <p className="font-medium">Why Matched:</p>

            <ul className="list-disc pl-5 text-sm">
              {job.reasoning.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

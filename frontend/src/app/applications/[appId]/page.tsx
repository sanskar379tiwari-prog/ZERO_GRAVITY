"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { getApplication } from "@/lib/api";
import { ApplicationRecord } from "@/types/application";
import { Loader } from "@/components/Loader";

export default function ApplicationDetailPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = use(params);
  const [app, setApp] = useState<ApplicationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getApplication(appId);
        setApp(data);
      } catch (err) {
        console.error(err);
        setError("Could not load application details.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [appId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6">
        <Loader message="Fetching application assets..." />
      </main>
    );
  }

  if (error || !app) {
    return (
      <main className="min-h-screen bg-[#fafafa] p-12 text-center">
        <div className="mx-auto max-w-md rounded-[5px] border-2 border-[#323232] bg-white px-5 py-3 text-sm font-black text-[#323232] shadow-[4px_4px_#323232]">
          ⚠️ {error || "Application not found."}
        </div>
        <Link href="/applications" className="mt-6 inline-block no-underline font-black text-[#323232] border-b-2 border-[#323232]">
          ← Back to Tracker
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fafafa] text-[#323232] p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b-2 border-[#323232] pb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-[#323232]">{app.job_title}</h1>
            <p className="mt-2 text-base text-[#666] font-bold">
              {app.company} • Applied on {new Date(app.created_at).toLocaleDateString()}
            </p>
          </div>
          <Link
            href="/applications"
            className="no-underline rounded-[5px] border-2 border-[#323232] bg-white px-5 py-2.5 text-sm font-black text-[#323232] shadow-[3px_3px_#323232] transition-all hover:shadow-[0px_0px_#323232] hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            ← Back to Tracker
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Section 1: Outreach Email */}
          <div className="minimal-card p-8 bg-white">
            <h3 className="text-xl font-black mb-4 uppercase tracking-wider border-b-2 border-[#323232] pb-2">
              📧 Outreach Draft
            </h3>
            {app.outreach_draft ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-[#999] tracking-widest">Subject</label>
                  <p className="text-sm font-black text-[#323232] mt-1">{app.outreach_draft.subject}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-[#999] tracking-widest">Message</label>
                  <div className="mt-2 p-4 bg-[#fcfcfc] border-2 border-[#323232]/10 rounded-[5px] text-sm text-[#666] font-bold whitespace-pre-wrap leading-relaxed">
                    {app.outreach_draft.email_body}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#999] italic font-bold">No outreach draft available for this application.</p>
            )}
          </div>

          {/* Section 2: Tailored Resume & Keywords */}
          <div className="space-y-8">
            <div className="minimal-card p-8 bg-white border-2 !border-[#2d8cf0] shadow-[6px_6px_#2d8cf0]">
              <h3 className="text-xl font-black mb-4 uppercase tracking-wider border-b-2 border-[#2d8cf0] pb-2 text-[#2d8cf0]">
                ✨ Resume Assets
              </h3>
              {app.tailored_resume ? (
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-[#999] tracking-widest">Optimization Strategy</label>
                    <p className="text-sm text-[#666] font-bold mt-1">
                      Your resume was rewritten to emphasize core competencies required for the {app.job_title} role at {app.company}.
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black uppercase text-[#323232] font-black tracking-widest mb-3 block">
                      🎯 Injected ATS Keywords
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(app.tailored_resume.ats_keywords_injected || []).map((kw: string) => (
                        <span key={kw} className="px-3 py-1.5 rounded-[5px] text-[10px] font-black uppercase bg-white text-[#323232] border-2 border-[#323232] shadow-[2px_2px_#323232]">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      className="w-full no-underline rounded-[5px] border-2 border-[#323232] bg-[#323232] py-3 text-sm font-black text-white shadow-[4px_4px_#000] transition-all hover:shadow-[0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]"
                      onClick={() => alert("PDF Preview is being regenerated. Check back in a moment.")}
                    >
                      📄 Download Tailored Resume PDF
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#999] italic font-bold">No tailored assets found for this application.</p>
              )}
            </div>

            {/* Section 3: Metadata */}
            <div className="minimal-card p-6 bg-white">
               <h4 className="text-[10px] font-black uppercase text-[#999] tracking-widest mb-4">Application Metadata</h4>
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-[#f0f0f0] rounded-[5px] border border-[#323232]/10">
                    <p className="text-[9px] font-black uppercase text-[#999]">Status</p>
                    <p className="text-sm font-black text-[#323232]">{app.status}</p>
                  </div>
                  <div className="p-3 bg-[#f0f0f0] rounded-[5px] border border-[#323232]/10">
                    <p className="text-[9px] font-black uppercase text-[#999]">Job ID</p>
                    <p className="text-sm font-black text-[#323232] truncate">{app.job_id}</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

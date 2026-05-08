export type ApplicationStatus = "Applied" | "Pending" | "Interview" | "Rejected";

export interface ApplicationRecord {
  app_id: string;
  job_id: string;
  job_title: string;
  company: string;
  profile_name: string;
  status: ApplicationStatus;
  created_at: string;
}

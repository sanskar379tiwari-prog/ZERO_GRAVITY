export interface JobMatch {
  job_id: string;
  title: string;
  company: string;
  location: string;
  match_score: number;
  semantic_score?: number;
  ats_score?: number;
  reasoning: string[];
  skills_overlap?: string[];
  description?: string;
  url?: string;
  remote?: boolean;
  posted_at?: string;
  salary_min?: number;
  salary_max?: number;
  source?: string;
}

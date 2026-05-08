export interface JobMatch {
  job_id: string;
  title: string;
  company: string;
  location: string;
  match_score: number;
  reasoning: string[];
  skills_overlap: string[];
}

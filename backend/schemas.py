from pydantic import BaseModel
from typing import List, Dict

class Profile(BaseModel):
    name: str
    skills: List[str]
    experience_years: int
    roles: List[str]
    location: str
    salary_expectation: Dict[str, int]
    remote_preference: str

class Job(BaseModel):
    id: str
    title: str
    company: str
    location: str
    remote: bool
    salary_min: int
    salary_max: int
    description: str
    posted_at: str
    url: str

class MatchScore(BaseModel):
    match_score: int
    skill_overlap: int
    experience_overlap: int
    location_match: int
    remote_compatibility: int
    ats_keyword_similarity: int
    salary_match: int
    job_freshness: int
    estimated_shortlist_probability: int
    reasoning: List[str]

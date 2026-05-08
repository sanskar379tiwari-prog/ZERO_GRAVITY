"""Resume Optimization Engine
Core logic for iterative resume optimization with validation feedback.
"""
import json
from typing import Dict, Optional
from google import genai
from agents.filters import run_filters


class OptimizationEngine:
    """Orchestrates resume optimization with feedback loops."""
    
    MAX_ITERATIONS = 2  # Keep LLM calls efficient
    
    def __init__(self, client: genai.Client, model: str = "gemini-3.1-flash-lite"):
        self.client = client
        self.model = model
    
    def optimize(
        self, 
        profile: dict, 
        job: dict, 
        resume_text: str,
        user_instructions: Optional[str] = None,
        debug: bool = False
    ) -> dict:
        """
        Optimize resume with iterative validation.
        
        Args:
            profile: Candidate profile (from agent1)
            job: Job posting (from agent2)
            resume_text: Original resume as plain text
            user_instructions: Optional user guidance ("Focus on Python", etc.)
            debug: Return iteration history
        
        Returns:
            {
                "tailored_sections": {...},
                "quality_report": {...},
                "iterations": [...],  # if debug=True
                "success": bool
            }
        """
        iterations = []
        feedback = None
        sections = None
        
        for iteration in range(self.MAX_ITERATIONS):
            sections = self._generate_sections(
                profile, job, resume_text, user_instructions, feedback
            )
            
            quality = run_filters(sections, job.get("description", ""), resume_text)
            
            if debug:
                iterations.append({
                    "iteration": iteration + 1,
                    "sections": sections,
                    "quality": quality
                })
            
            # Early exit on success
            if quality["overall_pass"]:
                return {
                    "tailored_sections": sections,
                    "quality_report": quality,
                    "iterations": iterations if debug else None,
                    "success": True,
                }
            
            # Generate feedback for next iteration
            feedback = self._generate_feedback(quality)
        
        # Final attempt (even if not passing all checks)
        return {
            "tailored_sections": sections,
            "quality_report": quality,
            "iterations": iterations if debug else None,
            "success": quality["overall_pass"],
        }
    
    def _generate_sections(
        self, 
        profile: dict,
        job: dict,
        resume_text: str,
        user_instructions: Optional[str],
        feedback: Optional[str]
    ) -> dict:
        """Call LLM to generate tailored resume sections."""
        
        feedback_prompt = ""
        if feedback:
            feedback_prompt = f"\n\nPREVIOUS FEEDBACK:\n{feedback}\nPlease address these issues in the next iteration."
        
        if user_instructions:
            instructions_prompt = f"\n\nUSER INSTRUCTIONS:\n{user_instructions}"
        else:
            instructions_prompt = ""
        
        prompt = f"""You are an expert ATS resume optimizer. Tailor this resume for the specific job, focusing on matching keywords and proving relevant experience.

CANDIDATE PROFILE:
{json.dumps(profile, indent=2)}

JOB:
Title: {job.get('title', 'Software Role')}
Company: {job.get('company', 'Company')}
Description: {job.get('description', '')[:1500]}

ORIGINAL RESUME:
{resume_text[:2500]}{instructions_prompt}{feedback_prompt}

IMPORTANT RULES:
1. DO NOT fabricate skills or experience not in the original resume
2. Highlight existing skills that match the job
3. Use job keywords naturally in bullets
4. Keep formatting simple (no special chars, plain ASCII)
5. Make bullets specific and quantifiable where possible

Return ONLY valid JSON (no markdown, no extra text):
{{
  "name": "Full Name",
  "contact_line": "email | phone | location",
  "summary": "2-3 sentence targeted summary",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {{
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Month Year - Month Year",
      "bullets": ["achievement with metrics", "relevant responsibility"]
    }}
  ],
  "education": [{{"degree": "Degree", "school": "University", "year": "Year"}}],
  "projects": [{{"name": "Project", "description": "2 sentence description with keywords"}}],
  "ats_keywords_injected": ["keyword1", "keyword2"]
}}"""
        
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
            )
            raw = response.text.strip()
            sections = self._extract_json(raw)
            return self._normalize_sections(sections, profile, job)
        except json.JSONDecodeError as e:
            print(f"[OptimizationEngine] JSON decode error: {e}")
            print(f"[OptimizationEngine] raw response: {raw}")
            return self._fallback_sections(profile, job)
        except Exception as e:
            print(f"[OptimizationEngine] LLM error: {e}")
            return self._fallback_sections(profile, job)
    
    def _extract_json(self, raw: str) -> dict:
        """Extract JSON object from raw LLM text."""
        if raw.startswith("```"):
            raw = raw.strip("`\n ")
        start = raw.find("{")
        end = raw.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise json.JSONDecodeError("No JSON object found", raw, 0)
        raw_json = raw[start:end+1]
        return json.loads(raw_json)

    def _normalize_sections(self, sections: dict, profile: dict, job: dict) -> dict:
        """Ensure all required fields exist and use safe defaults."""
        if not isinstance(sections, dict):
            return self._fallback_sections(profile, job)

        normalized = {
            "name": str(sections.get("name", profile.get("name", "Candidate"))).strip(),
            "contact_line": str(sections.get("contact_line", profile.get("location", ""))).strip(),
            "summary": str(sections.get("summary", "")).strip(),
            "skills": sections.get("skills") if isinstance(sections.get("skills"), list) else [],
            "experience": [],
            "education": [],
            "projects": [],
            "ats_keywords_injected": sections.get("ats_keywords_injected") if isinstance(sections.get("ats_keywords_injected"), list) else [],
        }

        for exp in sections.get("experience", []) if isinstance(sections.get("experience"), list) else []:
            if isinstance(exp, dict):
                normalized["experience"].append({
                    "title": str(exp.get("title", "")).strip(),
                    "company": str(exp.get("company", "")).strip(),
                    "duration": str(exp.get("duration", "")).strip(),
                    "bullets": [str(b).strip() for b in exp.get("bullets", []) if b],
                })

        for ed in sections.get("education", []) if isinstance(sections.get("education"), list) else []:
            if isinstance(ed, dict):
                normalized["education"].append({
                    "degree": str(ed.get("degree", "")).strip(),
                    "school": str(ed.get("school", "")).strip(),
                    "year": str(ed.get("year", "")).strip(),
                })

        for proj in sections.get("projects", []) if isinstance(sections.get("projects"), list) else []:
            if isinstance(proj, dict):
                normalized["projects"].append({
                    "name": str(proj.get("name", "")).strip(),
                    "description": str(proj.get("description", "")).strip(),
                })

        if not normalized["summary"]:
            normalized["summary"] = f"Professional candidate interested in {job.get('title', 'this opportunity')} at {job.get('company', 'your company')}."

        return normalized

    def _generate_feedback(self, quality: dict) -> str:
        """Generate feedback to guide next iteration."""
        issues = []
        
        if not quality["ats_valid"]:
            issues.append(f"ATS issues: {', '.join(quality['ats_errors'][:2])}")
        
        if quality["keyword_match"] < 0.5:
            issues.append(f"Poor keyword match ({quality['keyword_match']}). Add more job-specific keywords.")
        
        if quality["hallucinations"]:
            issues.append(f"Unsubstantiated claims: {quality['hallucinations'][0]}")
        
        if quality["ai_score"] > 0.4:
            issues.append("Use more natural, specific language. Reduce generic corporate phrases.")
        
        return " ".join(issues) if issues else None
    
    def _fallback_sections(self, profile: dict, job: dict) -> dict:
        """Return fallback sections when LLM fails."""
        return {
            "name": profile.get("name", "Candidate"),
            "contact_line": profile.get("location", ""),
            "summary": f"Professional seeking {job.get('title', 'role')} at {job.get('company', 'company')}.",
            "skills": profile.get("skills", [])[:5],
            "experience": profile.get("experience", [])[:2],
            "education": profile.get("education", []),
            "projects": [],
            "ats_keywords_injected": [],
        }

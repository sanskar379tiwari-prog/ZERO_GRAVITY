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
        
        prompt = f"""You are an expert ATS resume optimizer. Your task is to rewrite the candidate's resume to perfectly align with the job description while maintaining 100% honesty.
        
        CANDIDATE PROFILE (Key Strengths):
        {json.dumps(profile, indent=2)}
        
        TARGET JOB:
        Title: {job.get('title', 'Software Role')}
        Company: {job.get('company', 'Company')}
        Description: {job.get('description', '')[:3000]}
        
        FULL ORIGINAL RESUME CONTENT:
        {resume_text[:12000]}
        
        {instructions_prompt}
        {feedback_prompt}
        
        INSTRUCTIONS:
        1. REWRITE the professional summary to be high-impact and job-specific.
        2. OPTIMIZE work experience from the original resume. DO NOT OMIT EXPERIENCE. Keep all relevant roles.
        3. Include all education and certifications from the original resume.
        4. Include all relevant projects.
        5. Ensure the "skills" list is comprehensive (10-15 keywords).
        6. Return ONLY valid JSON with this EXACT structure.
        
        REQUIRED JSON STRUCTURE:
        {{
          "name": "Full Name",
          "contact_line": "email | phone | location",
          "professional_summary": "2-3 targeted sentences",
          "skills": ["Skill 1", "Skill 2"],
          "experience": [
            {{
              "company": "Company Name",
              "role": "Job Title",
              "duration": "Dates",
              "bullets": ["Bullet 1", "Bullet 2"]
            }}
          ],
          "projects": [
            {{
              "title": "Project Name",
              "description": "Project details"
            }}
          ],
          "education": [
            {{
              "institution": "University Name",
              "degree": "Degree Earned",
              "year": "Graduation Year"
            }}
          ],
          "ats_keywords_injected": ["keyword1", "keyword2"]
        }}"""
        
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
        )
        raw = response.text.strip()
        
        # DEBUG LOGGING (Requirement: Step 1)
        print("\n" + "="*50, flush=True)
        print("RAW GEMINI RESPONSE (Resume Tailoring)", flush=True)
        print("="*50, flush=True)
        print(raw, flush=True)
        print("="*50 + "\n", flush=True)

        try:
            sections = self._extract_json(raw)
            return self._normalize_sections(sections, profile, job)
        except json.JSONDecodeError as e:
            print(f"[OptimizationEngine] JSON decode error: {e}")
            raw = self._retry_strict_json(prompt)
            try:
                sections = self._extract_json(raw)
                return self._normalize_sections(sections, profile, job)
            except Exception:
                return self._fallback_sections(profile, job)
        except Exception as e:
            print(f"[OptimizationEngine] LLM error: {e}")
            return self._fallback_sections(profile, job)
    
    def _retry_strict_json(self, prompt: str) -> str:
        strict_prompt = prompt + (
            "\n\nIMPORTANT: Return only a bare JSON object with no explanation, no headings, and no markdown. "
            "Use the exact keys name, contact_line, professional_summary, skills, experience, education, projects, ats_keywords_injected. "
            "If a value is not available, use an empty string or empty list."
        )
        response = self.client.models.generate_content(
            model=self.model,
            contents=strict_prompt,
        )
        return response.text.strip()
    
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
            "name": str(self._get_value(sections, ["name", "full_name"], profile.get("name", "Candidate"))).strip(),
            "contact_line": str(self._get_value(sections, ["contact_line", "contact"], profile.get("location", ""))).strip(),
            "professional_summary": str(self._get_value(sections, ["professional_summary", "summary", "overview"], "")).strip(),
            "skills": self._get_list(sections, ["skills", "technical_skills"]),
            "experience": [],
            "education": [],
            "projects": [],
            "ats_keywords_injected": self._get_list(sections, ["ats_keywords_injected", "keywords"]),
        }

        # Experience Mapping
        for exp in self._get_list(sections, ["experience", "work_experience"]):
            if isinstance(exp, dict):
                normalized["experience"].append({
                    "role": str(self._get_value(exp, ["role", "title", "position"], "")).strip(),
                    "company": str(self._get_value(exp, ["company", "organization", "employer"], "")).strip(),
                    "duration": str(self._get_value(exp, ["duration", "dates"], "")).strip(),
                    "bullets": [str(b).strip() for b in self._get_list(exp, ["bullets", "highlights"]) if b],
                })

        # Education Mapping
        for ed in self._get_list(sections, ["education", "education_history"]):
            if isinstance(ed, dict):
                normalized["education"].append({
                    "degree": str(self._get_value(ed, ["degree", "qualification"], "")).strip(),
                    "institution": str(self._get_value(ed, ["institution", "school", "university"], "")).strip(),
                    "year": str(self._get_value(ed, ["year", "graduation_year"], "")).strip(),
                })

        # Projects Mapping
        for proj in self._get_list(sections, ["projects", "project_experience"]):
            if isinstance(proj, dict):
                normalized["projects"].append({
                    "title": str(self._get_value(proj, ["title", "name", "project_name"], "")).strip(),
                    "description": str(self._get_value(proj, ["description", "summary"], "")).strip(),
                })

        # Final Fallback check for critical sections
        if not normalized["professional_summary"]:
            normalized["professional_summary"] = f"Goal-oriented professional with experience in {', '.join(normalized['skills'][:3])}."

        return normalized

    def _get_value(self, source: dict, keys: list, default=None):
        for key in keys:
            if key in source and source[key] is not None:
                return source[key]
        return default

    def _get_list(self, source: dict, keys: list) -> list:
        for key in keys:
            value = source.get(key)
            if isinstance(value, list):
                return value
        return []

    def _generate_feedback(self, quality: dict) -> str:
        """Generate feedback to guide next iteration."""
        issues = []
        
        if not quality["ats_valid"]:
            issues.append(f"ATS issues: {', '.join(quality['ats_errors'][:2])}")
        
        if quality["keyword_match"] < 0.5:
            issues.append(f"Poor keyword match ({quality['keyword_match']}). Add more job-specific keywords.")
        
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

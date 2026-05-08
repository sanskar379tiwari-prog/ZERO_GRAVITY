"""Agent 4 — Resume Tailoring
Calls Gemini to rewrite resume sections optimised for a specific job,
then generates a clean ATS-ready PDF with ReportLab.
"""
import io, json, os, base64
from google import genai
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from dotenv import load_dotenv

load_dotenv()
_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))
MODEL = "gemini-2.5-flash-lite-preview-06-17"

PROMPT = """You are an expert ATS resume optimizer. Rewrite the candidate's resume for this specific job.

CANDIDATE PROFILE:
{profile}

JOB:
Title: {title}
Company: {company}
Description: {description}

ORIGINAL RESUME TEXT:
{resume_text}

Return ONLY a JSON object (no markdown):
{{
  "name": "candidate full name",
  "contact_line": "email | phone | location | linkedin",
  "summary": "2-3 sentence professional summary tailored to the job",
  "skills": ["skill1", "skill2"],
  "experience": [
    {{
      "title": "Job Title",
      "company": "Company",
      "duration": "Jan 2023 – Present",
      "bullets": ["achievement 1", "achievement 2"]
    }}
  ],
  "education": [{{"degree": "B.S. CS", "school": "University", "year": "2022"}}],
  "projects": [{{"name": "Project", "description": "1-2 sentences with keywords"}}],
  "ats_keywords_injected": ["kw1", "kw2"]
}}"""


def tailor(profile: dict, job: dict, resume_text: str) -> dict:
    sections = _call_gemini(profile, job, resume_text)
    pdf_bytes = _build_pdf(sections)
    return {
        "tailored_sections": sections,
        "pdf_base64": base64.b64encode(pdf_bytes).decode("utf-8"),
        "ats_keywords": sections.get("ats_keywords_injected", []),
    }


def _call_gemini(profile: dict, job: dict, resume_text: str) -> dict:
    prompt = PROMPT.format(
        profile=json.dumps(profile, indent=2),
        title=job.get("title", ""),
        company=job.get("company", ""),
        description=job.get("description", "")[:1500],
        resume_text=resume_text[:3000],
    )
    model = MODEL
    for attempt in range(3):
        try:
            response = _client.models.generate_content(
                model=model,
                contents=prompt,
            )
            raw = response.text.strip()
            if raw.startswith("```"):
                raw = raw.split("```", 2)[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            return json.loads(raw.strip())
        except json.JSONDecodeError as e:
            print(f"[Agent 4] JSON parse error (attempt {attempt+1}): {e}")
        except Exception as e:
            print(f"[Agent 4] Gemini error: {e}. Using fallback.")
            break
    return _fallback(profile, job)


def _fallback(profile: dict, job: dict) -> dict:
    return {
        "name": profile.get("name", "Candidate"),
        "contact_line": profile.get("location", ""),
        "summary": (
            f"Motivated professional seeking {job.get('title', 'a software')} role "
            f"at {job.get('company', 'your company')}. "
            "Passionate about delivering high-quality solutions."
        ),
        "skills": profile.get("skills", []),
        "experience": [],
        "education": [],
        "projects": [],
        "ats_keywords_injected": [],
    }


def _build_pdf(s: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=letter,
        rightMargin=0.7 * inch, leftMargin=0.7 * inch,
        topMargin=0.6 * inch, bottomMargin=0.6 * inch,
    )

    DARK = colors.HexColor("#16213e")
    MID  = colors.HexColor("#555555")
    BODY = colors.HexColor("#333333")

    name_style = ParagraphStyle("N", fontSize=20, fontName="Helvetica-Bold",
                                alignment=TA_CENTER, spaceAfter=4, textColor=DARK)
    contact_style = ParagraphStyle("C", fontSize=9, fontName="Helvetica",
                                   alignment=TA_CENTER, spaceAfter=10, textColor=MID)
    h_style = ParagraphStyle("H", fontSize=11, fontName="Helvetica-Bold",
                              spaceBefore=8, spaceAfter=3, textColor=DARK)
    job_style = ParagraphStyle("J", fontSize=10, fontName="Helvetica-Bold",
                               spaceAfter=1, textColor=DARK)
    dur_style = ParagraphStyle("D", fontSize=9, fontName="Helvetica-Oblique",
                               spaceAfter=2, textColor=MID)
    body_style = ParagraphStyle("B", fontSize=9, fontName="Helvetica",
                                spaceAfter=3, textColor=BODY, leading=13)
    bullet_style = ParagraphStyle("BL", fontSize=9, fontName="Helvetica",
                                  leftIndent=12, spaceAfter=2, textColor=BODY, leading=13)

    def hr(): return HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cccccc"), spaceAfter=4)
    def hr_bold(): return HRFlowable(width="100%", thickness=1.5, color=DARK, spaceAfter=4)

    story = []

    story.append(Paragraph(s.get("name", "Your Name"), name_style))
    if s.get("contact_line"):
        story.append(Paragraph(s["contact_line"], contact_style))

    if s.get("summary"):
        story.append(hr_bold())
        story.append(Paragraph("PROFESSIONAL SUMMARY", h_style))
        story.append(Paragraph(s["summary"], body_style))

    if s.get("skills"):
        story.append(hr())
        story.append(Paragraph("TECHNICAL SKILLS", h_style))
        story.append(Paragraph(" • ".join(s["skills"]), body_style))

    if s.get("experience"):
        story.append(hr())
        story.append(Paragraph("EXPERIENCE", h_style))
        for exp in s["experience"]:
            story.append(Paragraph(f"{exp.get('title','')} — {exp.get('company','')}", job_style))
            story.append(Paragraph(exp.get("duration", ""), dur_style))
            for b in exp.get("bullets", []):
                story.append(Paragraph(f"• {b}", bullet_style))
            story.append(Spacer(1, 4))

    if s.get("education"):
        story.append(hr())
        story.append(Paragraph("EDUCATION", h_style))
        for ed in s["education"]:
            story.append(Paragraph(
                f"{ed.get('degree','')} — {ed.get('school','')} ({ed.get('year','')})", body_style))

    if s.get("projects"):
        story.append(hr())
        story.append(Paragraph("PROJECTS", h_style))
        for p in s["projects"]:
            story.append(Paragraph(f"<b>{p.get('name','')}</b>: {p.get('description','')}", body_style))

    if s.get("ats_keywords_injected"):
        story.append(hr())
        story.append(Paragraph("KEYWORDS", h_style))
        story.append(Paragraph(", ".join(s["ats_keywords_injected"]), body_style))

    doc.build(story)
    return buf.getvalue()

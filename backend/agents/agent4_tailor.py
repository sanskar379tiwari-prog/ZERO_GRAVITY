"""Agent 4 — Resume Tailoring (Enhanced)
Uses OptimizationEngine with multi-filter validation.
Supports multiple input formats (PDF, HTML, text) and generates ATS-ready PDFs.
"""
import io, json, os, base64
from typing import Optional
from google import genai
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from dotenv import load_dotenv
from agents.optimization_engine import OptimizationEngine
from agents.resume_parser import parse_resume
from usage import tracker

load_dotenv()
_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))
MODEL = "gemini-1.5-flash"
_optimizer = OptimizationEngine(_client, MODEL)

def tailor(
    profile: dict, 
    job: dict, 
    resume_text: str,
    format: Optional[str] = None,
    user_instructions: Optional[str] = None,
    debug: bool = False
) -> dict:
    """
    Tailor resume with multi-filter validation.
    
    Args:
        profile: Candidate profile (from agent1)
        job: Job posting (from agent2)
        resume_text: Resume content (string or bytes)
        format: Optional format hint ("pdf", "html", "text")
        user_instructions: Optional guidance ("Focus on Python", etc.)
        debug: Include iteration history
    """
    tracker.log_call("Agent 4 (Resume Tailor)")
    
    # Parse resume if not plain text
    if format or isinstance(resume_text, bytes):
        resume_text = parse_resume(resume_text, format)
    
    # Optimize with validation
    result = _optimizer.optimize(
        profile, job, resume_text, 
        user_instructions=user_instructions,
        debug=debug
    )
    
    # Generate PDF
    sections = result["tailored_sections"]
    pdf_bytes = _build_pdf(sections)
    
    return {
        "tailored_sections": sections,
        "pdf_base64": base64.b64encode(pdf_bytes).decode("utf-8"),
        "ats_keywords": sections.get("ats_keywords_injected", []),
        "quality_report": result.get("quality_report"),
        "success": result.get("success"),
        "debug_iterations": result.get("iterations") if debug else None,
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

    # Header
    story.append(Paragraph(s.get("name", "Candidate"), name_style))
    story.append(Paragraph(s.get("contact_line", ""), contact_style))
    story.append(Spacer(1, 10))

    # Summary
    summary_text = s.get("professional_summary") or s.get("summary")
    if summary_text:
        story.append(Paragraph("PROFESSIONAL SUMMARY", h_style))
        story.append(Paragraph(summary_text, body_style))
        story.append(Spacer(1, 4))

    # Skills
    if s.get("skills"):
        story.append(hr())
        story.append(Paragraph("TECHNICAL SKILLS", h_style))
        
        skills = s["skills"]
        chunks = [skills[i:i + 6] for i in range(0, len(skills), 6)]
        for chunk in chunks:
            story.append(Paragraph(" • ".join(chunk), body_style))
        story.append(Spacer(1, 4))

    # Experience
    if s.get("experience"):
        story.append(hr())
        story.append(Paragraph("PROFESSIONAL EXPERIENCE", h_style))
        story.append(Spacer(1, 4))
        
        for exp in s["experience"]:
            role = exp.get("role") or exp.get("title", "")
            company = exp.get("company", "")
            story.append(Paragraph(f"{role} — {company}", job_style))
            story.append(Paragraph(exp.get("duration", ""), dur_style))
            for b in exp.get("bullets", []):
                story.append(Paragraph(f"• {b}", bullet_style))
            story.append(Spacer(1, 6))

    # Projects
    if s.get("projects"):
        story.append(hr())
        story.append(Paragraph("PROJECTS", h_style))
        story.append(Spacer(1, 4))
        
        for p in s["projects"]:
            title = p.get("title") or p.get("name", "")
            story.append(Paragraph(title, job_style))
            story.append(Paragraph(p.get("description", ""), body_style))
            story.append(Spacer(1, 6))

    # Education
    if s.get("education"):
        story.append(hr())
        story.append(Paragraph("EDUCATION", h_style))
        story.append(Spacer(1, 4))
        
        for ed in s["education"]:
            inst = ed.get("institution") or ed.get("school", "")
            story.append(Paragraph(inst, job_style))
            story.append(Paragraph(f"{ed.get('degree', '')} — {ed.get('year', '')}", body_style))
            story.append(Spacer(1, 4))

    if s.get("ats_keywords_injected"):
        story.append(hr())
        story.append(Paragraph("KEYWORDS", h_style))
        story.append(Paragraph(", ".join(s["ats_keywords_injected"]), body_style))

    doc.build(story)
    return buf.getvalue()

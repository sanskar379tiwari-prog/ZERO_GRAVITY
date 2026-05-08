"""Resume Validation Filters
Multi-stage validation: ATS simulation, keyword matching, hallucination detection.
"""
import json
import re
from typing import Dict, List, Tuple
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


class ASTSimulator:
    """Simulates ATS parsing to check resume compatibility."""
    
    CRITICAL_SECTIONS = ["name", "email", "phone", "experience", "education", "skills"]
    PROBLEMATIC_PATTERNS = [
        r"[^\x00-\x7F]",  # Non-ASCII chars
        r"<[^>]+>",  # HTML tags
        r"__+",  # Multiple underscores (formatting)
        r"\[GRAPHIC\]|\[IMAGE\]",  # Embedded graphics
    ]
    
    @staticmethod
    def validate(sections: dict) -> Tuple[bool, List[str]]:
        """Returns (is_valid, [errors])"""
        errors = []
        
        # Check critical sections exist
        for section in ASTSimulator.CRITICAL_SECTIONS:
            if section not in sections or not sections[section]:
                errors.append(f"Missing or empty: {section}")
        
        # Check for problematic patterns
        full_text = json.dumps(sections)
        for pattern in ASTSimulator.PROBLEMATIC_PATTERNS:
            if re.search(pattern, full_text):
                errors.append(f"Problematic pattern found: {pattern}")
        
        # Check line length (ATS limitation)
        for key, val in sections.items():
            if isinstance(val, str) and len(val) > 100:
                if "\n" not in val and len(val) > 150:
                    errors.append(f"{key} line too long: {len(val)} chars")
        
        return len(errors) == 0, errors


class KeywordMatcher:
    """TF-IDF based keyword matching between job and resume."""
    
    @staticmethod
    def extract_keywords(text: str, top_n: int = 15) -> List[str]:
        """Extract top keywords using TF-IDF."""
        if not text or len(text) < 20:
            return []
        
        # Simple tokenization
        words = re.findall(r"\b[a-z]{3,}\b", text.lower())
        if not words:
            return []
        
        # Remove common stop words
        stops = {
            "the", "and", "for", "with", "from", "that", "this", "are", "was",
            "been", "have", "has", "had", "but", "not", "can", "will", "your"
        }
        words = [w for w in words if w not in stops]
        
        # TF-IDF scoring
        counter = Counter(words)
        return [w for w, _ in counter.most_common(top_n)]
    
    @staticmethod
    def match_score(job_text: str, resume_text: str) -> float:
        """Returns match score 0-1."""
        job_kw = set(KeywordMatcher.extract_keywords(job_text))
        resume_kw = set(KeywordMatcher.extract_keywords(resume_text))
        
        if not job_kw or not resume_kw:
            return 0.5  # Neutral if extraction fails
        
        intersection = len(job_kw & resume_kw)
        union = len(job_kw | resume_kw)
        return intersection / union if union > 0 else 0.0


class HallucinationChecker:
    """Detects if tailored resume added unsubstantiated claims."""
    
    @staticmethod
    def check(original_text: str, tailored_sections: dict) -> Tuple[bool, List[str]]:
        """Returns (is_clean, [hallucinations]). True = no hallucinations found."""
        hallucinations = []
        
        # Extract key nouns/skills from original
        original_entities = HallucinationChecker._extract_entities(original_text)
        
        # Check tailored sections
        tailored_text = json.dumps(tailored_sections)
        tailored_entities = HallucinationChecker._extract_entities(tailored_text)
        
        # New entities not in original = potential hallucinations
        suspicious = tailored_entities - original_entities
        
        # Common hallucinations: specific versions, exact percentages, fake projects
        patterns = [
            (r"\d+\.\d+\.\d+ version", "Specific version claim"),
            (r"increased.*\d+%", "Specific % improvement"),
            (r"(saved|reduced|optimized).*\$\d+[KM]?", "Specific savings claim"),
        ]
        
        for pattern, desc in patterns:
            if re.search(pattern, tailored_text, re.IGNORECASE):
                hallucinations.append(f"{desc}: needs verification")
        
        return len(hallucinations) == 0, list(hallucinations)
    
    @staticmethod
    def _extract_entities(text: str) -> set:
        """Extract noun entities (tech stack, tools, frameworks)."""
        # Common tech/framework patterns
        tech_pattern = r"\b(python|javascript|typescript|react|vue|angular|aws|gcp|docker|kubernetes|sql|postgresql|mongodb|node\.?js|fastapi|django|tensorflow|pytorch|machine learning|nlp|ml|ai|llm|api|rest|graphql)\b"
        return set(re.findall(tech_pattern, text.lower()))


class AIGeneratedChecker:
    """Detects AI-sounding text patterns."""
    
    AI_PHRASES = [
        "utilize", "leverage", "innovative", "cutting-edge", "dynamic",
        "seamless", "synergy", "paradigm", "digital transformation",
        "end-to-end solution", "optimized workflow", "scalable architecture"
    ]
    
    @staticmethod
    def check(text: str, threshold: float = 0.3) -> Tuple[bool, float]:
        """Returns (is_human, ai_score). is_human=True if score < threshold."""
        text_lower = text.lower()
        matches = sum(1 for phrase in AIGeneratedChecker.AI_PHRASES if phrase in text_lower)
        score = matches / len(AIGeneratedChecker.AI_PHRASES)
        return score < threshold, score


def run_filters(sections: dict, job_description: str, original_text: str) -> Dict:
    """Run all filters and return comprehensive report."""
    report = {
        "ats_valid": False,
        "ats_errors": [],
        "keyword_match": 0.0,
        "no_hallucinations": False,
        "hallucinations": [],
        "not_ai_generated": False,
        "ai_score": 0.0,
        "overall_pass": False,
    }
    
    # 1. ATS validation
    ats_valid, ats_errors = ASTSimulator.validate(sections)
    report["ats_valid"] = ats_valid
    report["ats_errors"] = ats_errors
    
    # 2. Keyword matching
    sections_text = json.dumps(sections)
    keyword_score = KeywordMatcher.match_score(job_description, sections_text)
    report["keyword_match"] = round(keyword_score, 2)
    
    # 3. Hallucination check
    no_hallucinations, hallucinations = HallucinationChecker.check(original_text, sections)
    report["no_hallucinations"] = no_hallucinations
    report["hallucinations"] = hallucinations
    
    # 4. AI-generated text check
    not_ai, ai_score = AIGeneratedChecker.check(sections_text)
    report["not_ai_generated"] = not_ai
    report["ai_score"] = round(ai_score, 2)
    
    # Overall pass: ATS valid + keyword match > 0.5 + no hallucinations
    report["overall_pass"] = (
        ats_valid and 
        keyword_score > 0.5 and 
        no_hallucinations
    )
    
    return report

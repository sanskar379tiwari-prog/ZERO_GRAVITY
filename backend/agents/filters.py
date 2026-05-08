"""Resume Validation Filters (Optimized)
Multi-stage validation: ATS simulation, TF-IDF keyword matching.
"""
import json
import re
from typing import Dict, List, Tuple
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


class ATSSimulator:
    """Simulates ATS parsing to check resume compatibility."""
    
    CRITICAL_SECTIONS = ["name", "experience", "education", "skills"]
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
        for section in ATSSimulator.CRITICAL_SECTIONS:
            if section not in sections or not sections[section]:
                errors.append(f"Missing or empty: {section}")
        
        # Check for problematic patterns
        full_text = json.dumps(sections)
        for pattern in ATSSimulator.PROBLEMATIC_PATTERNS:
            if re.search(pattern, full_text):
                errors.append(f"Problematic pattern found: {pattern}")
        
        return len(errors) == 0, errors


class KeywordMatcher:
    """TF-IDF and Cosine Similarity based matching between job and resume."""
    
    @staticmethod
    def match_score(job_text: str, resume_text: str) -> float:
        """Returns match score 0-1 using Cosine Similarity on TF-IDF vectors."""
        if not job_text or not resume_text:
            return 0.5
            
        try:
            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf = vectorizer.fit_transform([job_text, resume_text])
            score = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
            return float(score)
        except Exception:
            # Fallback to simple Jaccard-like matching if TF-IDF fails
            jw = set(re.findall(r"\b[a-z]{3,}\b", job_text.lower()))
            rw = set(re.findall(r"\b[a-z]{3,}\b", resume_text.lower()))
            if not jw or not rw: return 0.5
            return len(jw & rw) / len(jw | rw)


class AIGeneratedChecker:
    """Detects AI-sounding text patterns."""
    
    AI_PHRASES = [
        "utilize", "leverage", "innovative", "cutting-edge", "dynamic",
        "seamless", "synergy", "paradigm", "digital transformation",
        "end-to-end solution", "optimized workflow", "scalable architecture"
    ]
    
    @staticmethod
    def check(text: str, threshold: float = 0.4) -> Tuple[bool, float]:
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
        "not_ai_generated": False,
        "ai_score": 0.0,
        "overall_pass": False,
    }
    
    # 1. ATS validation
    ats_valid, ats_errors = ATSSimulator.validate(sections)
    report["ats_valid"] = ats_valid
    report["ats_errors"] = ats_errors
    
    # 2. Keyword matching
    sections_text = json.dumps(sections)
    keyword_score = KeywordMatcher.match_score(job_description, sections_text)
    report["keyword_match"] = round(keyword_score, 2)
    
    # 3. AI-generated text check
    not_ai, ai_score = AIGeneratedChecker.check(sections_text)
    report["not_ai_generated"] = not_ai
    report["ai_score"] = round(ai_score, 2)
    
    # Overall pass: ATS valid + keyword match > 0.3 (lower threshold for TF-IDF)
    report["overall_pass"] = ats_valid and keyword_score > 0.3
    
    return report

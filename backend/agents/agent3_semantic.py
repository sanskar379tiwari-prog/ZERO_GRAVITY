"""Agent 3.1 — Semantic Similarity Layer
Uses Gemini Embeddings to calculate semantic fit between candidate and job.
Includes auto-fallback for different model versions.
"""
import os
import numpy as np
from google import genai
from dotenv import load_dotenv

def get_client():
    load_dotenv(override=True)
    return genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))

# We will try these in order
EMBEDDING_MODELS = ["gemini-3.1-flash-lite", "text-embedding-004", "embedding-001"]

def get_embedding(text: str) -> list:
    """Get vector embedding for a string with multi-model fallback."""
    if not text:
        return []
    
    client = get_client()
    truncated = text[:3000] 
    
    for model_name in EMBEDDING_MODELS:
        try:
            response = client.models.embed_content(
                model=model_name,
                contents=truncated
            )
            if response.embeddings:
                return response.embeddings[0].values
        except Exception:
            continue # Try next model
            
    # If all fail, return empty list (calling function handles fallback)
    return []

def cosine_similarity(v1, v2):
    """Simple cosine similarity between two vectors."""
    if not v1 or not v2:
        return 0.0
    
    a = np.array(v1)
    b = np.array(v2)
    
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
        
    return float(dot / (norm_a * norm_b))

def batch_semantic_score(profile: dict, jobs: list) -> list:
    """
    Calculate semantic score for a batch of jobs.
    Returns the list of jobs with an added 'semantic_score' field.
    """
    profile_text = f"Roles: {', '.join(profile.get('roles', []))}. "
    profile_text += f"Skills: {', '.join(profile.get('skills', []))}. "
    profile_text += f"Experience: {profile.get('experience_years', 0)} years."
    
    profile_vec = get_embedding(profile_text)
    if not profile_vec:
        print("[Agent 3.1] Embedding models unavailable. Using heuristic match only.")
        for job in jobs:
            job["semantic_score"] = 0.5
        return jobs

    print(f"[Agent 3.1] Computing semantic similarity for {len(jobs)} jobs...")
    
    for job in jobs:
        job_text = f"{job.get('title', '')} {job.get('description', '')[:500]}"
        job_vec = get_embedding(job_text)
        
        if job_vec:
            score = cosine_similarity(profile_vec, job_vec)
            job["semantic_score"] = round(score, 4)
        else:
            job["semantic_score"] = 0.5
            
    return jobs

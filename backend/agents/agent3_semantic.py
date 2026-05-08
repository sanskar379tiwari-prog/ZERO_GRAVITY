"""Agent 3.1 — Semantic Similarity Layer
Uses Gemini Embeddings to calculate semantic fit between candidate and job.
"""
import os
import numpy as np
from google import genai
from dotenv import load_dotenv

def get_client():
    load_dotenv(override=True)
    return genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))

MODEL = "text-embedding-004"

def get_embedding(text: str) -> list:
    """Get vector embedding for a string."""
    if not text:
        return []
    
    try:
        client = get_client()
        # Truncate text to avoid limit issues (max ~2048 tokens for this model)
        truncated = text[:3000] 
        
        response = client.models.embed_content(
            model=MODEL,
            contents=truncated
        )
        return response.embeddings[0].values
    except Exception as e:
        print(f"[Agent 3.1] Embedding error: {e}")
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
    # Create a dense profile representation
    profile_text = f"Roles: {', '.join(profile.get('roles', []))}. "
    profile_text += f"Skills: {', '.join(profile.get('skills', []))}. "
    profile_text += f"Experience: {profile.get('experience_years', 0)} years. "
    profile_text += f"Location: {profile.get('location', '')}."
    
    profile_vec = get_embedding(profile_text)
    if not profile_vec:
        return jobs # Fallback: return without score

    print(f"[Agent 3.1] Computing semantic similarity for {len(jobs)} jobs...")
    
    for job in jobs:
        job_text = f"{job.get('title', '')} at {job.get('company', '')}. {job.get('description', '')[:500]}"
        job_vec = get_embedding(job_text)
        
        if job_vec:
            score = cosine_similarity(profile_vec, job_vec)
            job["semantic_score"] = round(score, 4)
        else:
            job["semantic_score"] = 0.5
            
    return jobs

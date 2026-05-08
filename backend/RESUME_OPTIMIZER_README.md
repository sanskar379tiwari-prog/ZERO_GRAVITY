# Resume Optimizer — HR-Breaker Integration Guide

This document explains the new resume optimization features integrated from HR-Breaker into Agent 4.

## New Architecture

### Core Components

1. **`optimization_engine.py`** — Orchestrates iterative resume optimization with validation feedback
   - `OptimizationEngine.optimize()` — Main entry point
   - Runs up to 2 iterations (configurable) for efficiency
   - Applies feedback from validation filters

2. **`filters.py`** — Multi-stage validation system
   - `ASTSimulator` — Checks ATS compatibility (structure, line lengths, special chars)
   - `KeywordMatcher` — TF-IDF based keyword matching (job vs resume)
   - `HallucinationChecker` — Prevents fabricating unsubstantiated claims
   - `AIGeneratedChecker` — Detects overly generic/corporate language
   - `run_filters()` — Runs all checks and returns comprehensive report

3. **`resume_parser.py`** — Multi-format input support
   - `PDFParser` — Extracts text from PDF
   - `HTMLParser_` — Extracts text from HTML
   - `MarkdownParser` — Strips markdown formatting
   - `parse_resume()` — Auto-detects and parses input

4. **`agent4_tailor.py` (Enhanced)** — Resume tailoring with validation
   - Updated to use `OptimizationEngine`
   - Accepts optional user instructions and debug mode
   - Returns quality report alongside tailored content

## API Changes

### Update: `/tailor-resume` POST Endpoint

**New Request Body:**
```json
{
  "profile": {...},
  "job": {...},
  "resume_text": "...",  // string or base64 if format specified
  "format": "pdf",       // optional: "pdf", "html", "text" (auto-detect if omitted)
  "user_instructions": "Focus on Python, add K8s cert",  // optional
  "debug": false         // optional: include iteration history
}
```

**New Response:**
```json
{
  "tailored_sections": {
    "name": "...",
    "summary": "...",
    "skills": [...],
    "experience": [...],
    "ats_keywords_injected": [...]
  },
  "pdf_base64": "...",
  "ats_keywords": [...],
  "quality_report": {
    "ats_valid": true,
    "ats_errors": [],
    "keyword_match": 0.68,      // 0-1 score
    "no_hallucinations": true,
    "hallucinations": [],
    "not_ai_generated": true,
    "ai_score": 0.12,           // 0-1, lower is better
    "overall_pass": true        // ATS + keyword > 0.5 + no hallucinations
  },
  "success": true,
  "debug_iterations": [...]     // if debug=true
}
```

## Usage Examples

### Basic Usage (No Changes Required)
```python
from agents import agent4_tailor

result = agent4_tailor.tailor(
    profile=profile_dict,
    job=job_dict,
    resume_text="John Doe\nPython Developer..."
)
# Returns: tailored_sections, pdf_base64, ats_keywords, quality_report
```

### With PDF Input & User Instructions
```python
# Resume as PDF bytes
with open("resume.pdf", "rb") as f:
    resume_pdf = f.read()

result = agent4_tailor.tailor(
    profile=profile_dict,
    job=job_dict,
    resume_text=resume_pdf,
    format="pdf",
    user_instructions="Focus on cloud architecture, add Terraform"
)
```

### Debug Mode (Iterative Optimization)
```python
result = agent4_tailor.tailor(
    profile=profile_dict,
    job=job_dict,
    resume_text=resume_text,
    debug=True
)

# Check iterations
for iteration in result["debug_iterations"]:
    print(f"Iteration {iteration['iteration']}:")
    print(f"  ATS Valid: {iteration['quality']['ats_valid']}")
    print(f"  Keyword Match: {iteration['quality']['keyword_match']}")
```

## Validation Filters Explained

### 1. ATS Simulator
**Checks:**
- All critical sections present (name, email, phone, experience, education, skills)
- No HTML tags, special formatting, or non-ASCII characters
- Line lengths within ATS limits (~150 chars)

**Output:**
- `ats_valid` (bool)
- `ats_errors` (list of specific problems)

### 2. Keyword Matcher
**Algorithm:**
- Extracts top 15 keywords from job using TF-IDF
- Compares against resume keywords
- Returns Jaccard similarity (0-1)

**Output:**
- `keyword_match` (0-1, where 1.0 = perfect match)

### 3. Hallucination Checker
**Detects:**
- New technologies/skills not in original resume
- Fabricated metrics ("increased 300%", "saved $2M")
- Unsubstantiated project claims

**Output:**
- `no_hallucinations` (bool)
- `hallucinations` (list of concerns)

### 4. AI-Generated Text Detector
**Pattern Matching:**
- Looks for corporate jargon ("leverage", "synergy", "paradigm", etc.)
- Scores text genericism
- Recommends more natural language if score > 0.3

**Output:**
- `not_ai_generated` (bool if score < 0.3)
- `ai_score` (0-1, lower is better)

### Overall Pass Criteria
A resume **passes validation** when:
- ✓ ATS is valid
- ✓ Keyword match > 0.5 (50%)
- ✓ No hallucinations detected

## LLM Efficiency

### Maximum 2 Iterations
The optimizer runs **at most 2 LLM calls**:
1. **First call:** Initial optimization with user instructions
2. **Second call:** Regeneration if validation fails with specific feedback

This keeps costs low while maintaining quality. Compare to HR-Breaker's iterative approach which can retry more times.

### Feedback Loop
If first attempt fails validation, the second call receives:
- Specific validation errors ("ATS issue: line too long")
- Keyword suggestions ("Poor match. Add more Python/FastAPI keywords")
- Hallucination warnings

## Integration Notes

### Dependencies Added
```
scikit-learn          # TF-IDF keyword matching
numpy                 # Matrix operations
(PyMuPDF already in requirements for PDF parsing)
```

### Breaking Changes
None. Old code continues to work — just pass `resume_text` as before.

### Optional Enhancements
1. **Dynamic Iteration Limit** — Adjust `OptimizationEngine.MAX_ITERATIONS`
2. **Custom Filter Threshold** — Modify `run_filters()` pass criteria
3. **Language Support** — Extend `resume_parser.py` for other formats (LaTeX, DOCX)

## Testing

### Test Keywords Matching
```python
from agents.filters import KeywordMatcher

job = "Python FastAPI Docker AWS PostgreSQL"
resume = "I built REST APIs with Python and FastAPI"
score = KeywordMatcher.match_score(job, resume)
print(score)  # e.g., 0.71
```

### Test Hallucination Detection
```python
from agents.filters import HallucinationChecker

original = "I built a REST API"
tailored = {
    "experience": [{
        "bullets": ["Led a 50-person team", "Increased revenue by 300%"]
    }]
}

clean, issues = HallucinationChecker.check(original, tailored)
print(issues)  # ['Specific % improvement: needs verification']
```

## Next Steps

1. **Test with real resumes** — Run end-to-end tests with various resume formats
2. **Tune thresholds** — Adjust keyword match threshold (currently 0.5) based on results
3. **Add more patterns** — Expand hallucination and AI-text pattern libraries
4. **Cache filters** — Optimize repeated runs with memoization

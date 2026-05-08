"""Agent 6 — Application Tracking & Interview Scheduling
Manages application state and basic interview slot conflict detection.
Uses an in-memory store for demo reliability (no Supabase required to run).
Swap _store with real Supabase calls once credentials are available.
"""
from datetime import datetime
from typing import Optional
import uuid

# ---------------------------------------------------------------------------
# In-memory store — replaced by Supabase in production
# ---------------------------------------------------------------------------
_applications: dict[str, dict] = {}
_interviews: dict[str, dict] = {}

VALID_STATUSES = {"Applied", "Pending", "Interview", "Rejected", "Offer"}


# ---------------------------------------------------------------------------
# Application helpers
# ---------------------------------------------------------------------------

def create_application(
    job_id: str,
    job_title: str,
    company: str,
    profile_name: str,
    status: str = "Applied",
) -> dict:
    """Create and store a new application record."""
    app_id = f"app-{uuid.uuid4().hex[:8]}"
    record = {
        "id": app_id,
        "job_id": job_id,
        "job_title": job_title,
        "company": company,
        "profile_name": profile_name,
        "status": status if status in VALID_STATUSES else "Applied",
        "applied_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "interview_id": None,
        "notes": "",
    }
    _applications[app_id] = record
    return record


def get_applications() -> list:
    """Return all tracked applications sorted by most recent."""
    return sorted(
        _applications.values(),
        key=lambda a: a["applied_at"],
        reverse=True,
    )


def update_status(app_id: str, status: str) -> Optional[dict]:
    """Update the status of an existing application."""
    if app_id not in _applications:
        return None
    if status not in VALID_STATUSES:
        return None
    _applications[app_id]["status"] = status
    _applications[app_id]["updated_at"] = datetime.utcnow().isoformat() + "Z"
    return _applications[app_id]


# ---------------------------------------------------------------------------
# Interview scheduling helpers
# ---------------------------------------------------------------------------

def schedule_interview(
    app_id: str,
    datetime_iso: str,
    duration_minutes: int = 60,
    platform: str = "Google Meet",
    notes: str = "",
) -> dict:
    """
    Schedule an interview for an application.
    Detects time conflicts with existing interviews.
    Returns the interview record (or a conflict error dict).
    """
    conflict = _detect_conflict(datetime_iso, duration_minutes, exclude_id=None)
    if conflict:
        return {
            "error": "time_conflict",
            "message": f"Conflict with interview '{conflict['company']}' at {conflict['scheduled_at']}",
            "conflicting_interview": conflict,
        }

    interview_id = f"iv-{uuid.uuid4().hex[:8]}"
    record = {
        "id": interview_id,
        "app_id": app_id,
        "company": _applications.get(app_id, {}).get("company", "Unknown"),
        "scheduled_at": datetime_iso,
        "duration_minutes": duration_minutes,
        "platform": platform,
        "notes": notes,
        "status": "Scheduled",
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    _interviews[interview_id] = record

    # Link interview to application and bump status
    if app_id in _applications:
        _applications[app_id]["interview_id"] = interview_id
        _applications[app_id]["status"] = "Interview"
        _applications[app_id]["updated_at"] = datetime.utcnow().isoformat() + "Z"

    return record


def get_interviews() -> list:
    """Return all scheduled interviews sorted chronologically."""
    return sorted(
        _interviews.values(),
        key=lambda i: i["scheduled_at"],
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _detect_conflict(
    new_start_iso: str,
    duration: int,
    exclude_id: Optional[str],
) -> Optional[dict]:
    """Return the first conflicting interview record, or None."""
    try:
        new_start = datetime.fromisoformat(new_start_iso.replace("Z", "+00:00"))
    except ValueError:
        return None  # unparseable datetime — skip conflict check

    from datetime import timedelta
    new_end = new_start + timedelta(minutes=duration)

    for iv in _interviews.values():
        if iv["id"] == exclude_id:
            continue
        try:
            iv_start = datetime.fromisoformat(iv["scheduled_at"].replace("Z", "+00:00"))
            iv_end = iv_start + timedelta(minutes=iv.get("duration_minutes", 60))
        except ValueError:
            continue

        # Overlap: new starts before existing ends AND new ends after existing starts
        if new_start < iv_end and new_end > iv_start:
            return iv

    return None

"""Agent 6 — Application Tracking (REST Optimized)
Uses direct Supabase REST API calls for maximum compatibility.
No complex C++ dependencies required.
"""
import os
import uuid
import requests
from datetime import datetime
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Initialization
# ---------------------------------------------------------------------------
URL: str = os.getenv("SUPABASE_URL", "")
KEY: str = os.getenv("SUPABASE_KEY", "")

# ---------------------------------------------------------------------------
# Supabase REST Helpers
# ---------------------------------------------------------------------------

def _sb_post(table: str, data: dict) -> Optional[dict]:
    if not URL or not KEY: return None
    headers = {
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    try:
        response = requests.post(f"{URL}/rest/v1/{table}", headers=headers, json=data, timeout=10)
        if response.status_code in (200, 201):
            return response.json()[0] if response.json() else None
        print(f"⚠️ Supabase POST {table} failed: {response.status_code} {response.text}")
    except Exception as e:
        print(f"⚠️ Supabase request error: {e}")
    return None

def _sb_get(table: str, query: str = "*", order: str = "created_at.desc") -> List[dict]:
    if not URL or not KEY: return []
    headers = {
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}"
    }
    try:
        url = f"{URL}/rest/v1/{table}?select={query}&order={order}"
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            return response.json()
        print(f"⚠️ Supabase GET {table} failed: {response.status_code} {response.text}")
    except Exception as e:
        print(f"⚠️ Supabase request error: {e}")
    return []

def _sb_patch(table: str, app_id: str, data: dict) -> Optional[dict]:
    if not URL or not KEY: return None
    headers = {
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    try:
        # We assume 'id' is the primary key in Supabase
        response = requests.patch(f"{URL}/rest/v1/{table}?id=eq.{app_id}", headers=headers, json=data, timeout=10)
        if response.status_code in (200, 204):
            return response.json()[0] if response.json() else {"id": app_id, **data}
        print(f"⚠️ Supabase PATCH {table} failed: {response.status_code} {response.text}")
    except Exception as e:
        print(f"⚠️ Supabase request error: {e}")
    return None

# ---------------------------------------------------------------------------
# Application Tracking
# ---------------------------------------------------------------------------

_memory_apps: Dict[str, Dict[str, Any]] = {}
VALID_STATUSES = {"Applied", "Pending", "Interview", "Rejected", "Offer"}

def create_application(
    job_id: str,
    job_title: str,
    company: str,
    profile_name: str,
    status: str = "Applied",
) -> Dict[str, Any]:
    validated_status = status if status in VALID_STATUSES else "Applied"
    
    payload = {
        "job_id": job_id,
        "job_title": job_title,
        "company": company,
        "profile_name": profile_name,
        "status": validated_status,
        "updated_at": datetime.utcnow().isoformat()
    }

    # Try Supabase first
    record = _sb_post("applications", payload)
    if record:
        record["app_id"] = str(record.get("id"))
        return record

    # Fallback to Memory
    app_id = f"app-{uuid.uuid4().hex[:8]}"
    mem_record = {
        **payload,
        "app_id": app_id,
        "created_at": datetime.utcnow().isoformat(),
        "notes": ""
    }
    _memory_apps[app_id] = mem_record
    return mem_record

def get_applications() -> List[Dict[str, Any]]:
    # Try Supabase
    records = _sb_get("applications")
    if records:
        for r in records: r["app_id"] = str(r.get("id"))
        return records

    # Fallback to Memory
    return sorted(_memory_apps.values(), key=lambda a: a.get("created_at", ""), reverse=True)

def update_status(app_id: str, status: str) -> Optional[Dict[str, Any]]:
    if status not in VALID_STATUSES: return None
    
    payload = {"status": status, "updated_at": datetime.utcnow().isoformat()}
    
    # Try Supabase
    # Note: app_id is the 'id' uuid in Supabase
    record = _sb_patch("applications", app_id, payload)
    if record:
        record["app_id"] = str(record.get("id"))
        return record

    # Fallback to Memory
    if app_id in _memory_apps:
        _memory_apps[app_id].update(payload)
        return _memory_apps[app_id]
    return None

import os
import requests
from google import genai
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

def run_diagnostics():
    print("=" * 60)
    print("ZERO GRAVITY — SYSTEM DIAGNOSTICS")
    print("=" * 60)

    # 1. Check Environment Variables
    print("\n[1] Checking Environment Variables...")
    keys = ["GEMINI_API_KEY", "RAPIDAPI_KEY"]
    for key in keys:
        val = os.getenv(key)
        status = "✅ OK" if val else "❌ MISSING"
        masked = f"{val[:4]}...{val[-4:]}" if val else "None"
        print(f"  {key:<20}: {status} ({masked})")

    # 2. Test Gemini (Agent 1)
    print("\n[2] Testing Gemini API (Model: gemini-3.1-flash-lite)...")
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            client = genai.Client(api_key=api_key)
            # Simple test call
            response = client.models.generate_content(
                model="gemini-3.1-flash-lite",
                contents="Hello, respond with 'OK'"
            )
            if "OK" in response.text:
                print("  Status: ✅ Gemini is active and responding.")
            else:
                print(f"  Status: ⚠️ Gemini responded but unexpected output: {response.text[:50]}")
        else:
            print("  Status: ❌ Skipped (No API Key)")
    except Exception as e:
        print(f"  Status: ❌ Gemini Failed: {e}")

    # 3. Test JSearch (Agent 2)
    print("\n[3] Testing JSearch API (RapidAPI)...")
    try:
        rapid_key = os.getenv("RAPIDAPI_KEY")
        if rapid_key:
            url = "https://jsearch.p.rapidapi.com/search"
            headers = {
                "X-RapidAPI-Key": rapid_key,
                "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
            }
            # Search for a very specific term to see if it works
            response = requests.get(url, headers=headers, params={"query": "Software Engineer in Bengaluru", "num_pages": "1"}, timeout=15)
            if response.status_code == 200:
                data = response.json()
                count = len(data.get("data", []))
                print(f"  Status: ✅ JSearch is active. Found {count} jobs.")
                if count > 0:
                    first_job = data["data"][0]
                    print(f"  Sample Result: {first_job.get('job_title')} at {first_job.get('employer_name')} ({first_job.get('job_country')})")
            else:
                print(f"  Status: ❌ JSearch Failed (HTTP {response.status_code}): {response.text}")
        else:
            print("  Status: ❌ Skipped (No RapidAPI Key)")
    except Exception as e:
        print(f"  Status: ❌ JSearch Network Error: {e}")

    # 4. Check Filesystem
    print("\n[4] Checking Local Assets...")
    mock_path = Path(__file__).resolve().parent / "mock_jobs.json"
    if mock_path.exists():
        print(f"  mock_jobs.json: ✅ Found ({mock_path.stat().st_size} bytes)")
    else:
        # Check root
        mock_path = Path(__file__).resolve().parents[1] / "mock_jobs.json"
        if mock_path.exists():
            print(f"  mock_jobs.json: ✅ Found in root")
        else:
            print("  mock_jobs.json: ❌ NOT FOUND (Fallback will fail)")

    print("\n" + "=" * 60)
    print("DIAGNOSTICS COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    run_diagnostics()

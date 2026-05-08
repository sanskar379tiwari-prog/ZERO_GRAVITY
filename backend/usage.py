"""Central usage tracker for API calls."""
import threading
from datetime import datetime

class UsageTracker:
    def __init__(self):
        self.stats = {
            "Gemini (3.1 Flash-Lite)": 0,
            "JSearch (RapidAPI)": 0,
            "Total Calls": 0
        }
        self.lock = threading.Lock()

    def log_call(self, api_name: str):
        with self.lock:
            self.stats["Total Calls"] += 1
            if api_name in self.stats:
                self.stats[api_name] += 1
            else:
                self.stats[api_name] = 1
            
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"\n" + "─" * 40)
            print(f"🚀 [API CALL] {api_name}")
            print(f"⏰ Time: {timestamp}")
            print(f"📊 Session Totals: {self.stats}")
            print("─" * 40 + "\n")

# Global instance
tracker = UsageTracker()

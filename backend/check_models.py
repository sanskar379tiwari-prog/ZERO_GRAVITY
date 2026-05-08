import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

def list_models():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env")
        return

    client = genai.Client(api_key=api_key)
    print(f"Checking models for API Key ending in ...{api_key[-4:]}")
    print("-" * 50)
    
    try:
        # List all models
        for model in client.models.list():
            # In the new SDK, we just want the 'name' attribute
            # It usually looks like 'models/gemini-1.5-flash'
            print(f"Found: {model.name}")
    except Exception as e:
        print(f"Failed to list models: {e}")

if __name__ == "__main__":
    list_models()

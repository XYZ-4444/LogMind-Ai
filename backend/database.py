import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))

supabase = None
if os.getenv("ENABLE_SUPABASE", "false").lower() == "true":
    from supabase import create_client
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SECRET_KEY")
    if not url or not key:
        raise RuntimeError("Supabase credentials are missing")
    supabase = create_client(url, key)

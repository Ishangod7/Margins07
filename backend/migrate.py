"""
Database Migration Runner for Margins
Uses Supabase Management API to execute raw SQL DDL migrations directly.
"""

import os
import sys
import httpx
from dotenv import load_dotenv

load_dotenv()

PROJECT_REF = "nwhvyhygodytkttoitpn"
ACCESS_TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")

def run_sql(sql_content: str, description: str = "") -> bool:
    if not ACCESS_TOKEN:
        print("[ERROR] SUPABASE_ACCESS_TOKEN is missing from backend/.env")
        return False

    url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }

    print(f"[MIGRATE] Running: {description or 'SQL query'}...")
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, headers=headers, json={"query": sql_content})
            if resp.status_code in (200, 201):
                print(f"[SUCCESS] Migration executed successfully!")
                return True
            else:
                print(f"[FAILED] HTTP {resp.status_code}: {resp.text}")
                return False
    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")
        return False

def run_migration_file(file_path: str) -> bool:
    if not os.path.exists(file_path):
        print(f"[ERROR] Migration file not found: {file_path}")
        return False
    with open(file_path, "r", encoding="utf-8") as f:
        sql = f.read()
    return run_sql(sql, description=os.path.basename(file_path))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        success = run_migration_file(sys.argv[1])
        sys.exit(0 if success else 1)
    else:
        print("Usage: python migrate.py <path_to_sql_file>")
        sys.exit(1)

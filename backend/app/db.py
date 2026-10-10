from supabase import create_client
from .config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# Service-role client: bypasses RLS. Every route must do its own authz.
supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

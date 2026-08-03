-- Auth creates profiles through this trigger function. It is not a public RPC
-- and does not need EXECUTE privileges for API roles.

revoke all on function public.lumno_handle_new_user()
  from public, anon, authenticated;

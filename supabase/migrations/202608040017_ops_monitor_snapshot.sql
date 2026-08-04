-- Expose only coarse operational counters to the secret-protected monitoring
-- Edge Function. No user ids, raw IPs, setting keys, or media paths leave the
-- database.

create or replace function public.lumno_get_monitor_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'captured_at', now(),
    'signup_hour', (
      select count(*) from public.lumno_signup_rate_events
      where created_at >= now() - interval '1 hour'
    ),
    'signup_day', (
      select count(*) from public.lumno_signup_rate_events
      where created_at >= now() - interval '24 hours'
    ),
    'captcha_verified_hour', (
      select count(*) from public.lumno_signup_captcha_passes
      where verified_at >= now() - interval '1 hour'
    ),
    'captcha_available', (
      select count(*) from public.lumno_signup_captcha_passes
      where consumed_at is null and expires_at >= now()
    ),
    'sync_hot_accounts', (
      select count(*) from public.lumno_sync_request_windows
      where window_started_at >= date_trunc('minute', now())
        and (register_count >= 16 or push_count >= 24 or pull_count >= 48)
    ),
    'sync_max_register', coalesce((
      select max(register_count) from public.lumno_sync_request_windows
      where window_started_at >= date_trunc('minute', now())
    ), 0),
    'sync_max_push', coalesce((
      select max(push_count) from public.lumno_sync_request_windows
      where window_started_at >= date_trunc('minute', now())
    ), 0),
    'sync_max_pull', coalesce((
      select max(pull_count) from public.lumno_sync_request_windows
      where window_started_at >= date_trunc('minute', now())
    ), 0),
    'media_active_bytes', coalesce((
      select active_bytes from public.lumno_media_global_usage where singleton
    ), 0),
    'retention_last_completed_at', (
      select last_completed_at from public.lumno_maintenance_state
      where job_name = 'data_retention'
    )
  );
$$;

revoke all on function public.lumno_get_monitor_snapshot()
  from public, anon, authenticated;
grant execute on function public.lumno_get_monitor_snapshot()
  to service_role;

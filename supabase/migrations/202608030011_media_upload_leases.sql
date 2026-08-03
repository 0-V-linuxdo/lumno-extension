-- Serialize replacement of one logical media asset across Edge invocations.

create table if not exists public.lumno_media_upload_leases (
  user_id uuid not null references auth.users(id) on delete cascade,
  client_asset_id text not null check (char_length(client_asset_id) between 1 and 120),
  lease_token uuid not null,
  expires_at timestamptz not null,
  primary key (user_id, client_asset_id)
);

alter table public.lumno_media_upload_leases enable row level security;
alter table public.lumno_media_upload_leases force row level security;
revoke all on public.lumno_media_upload_leases from public, anon, authenticated;
grant all on public.lumno_media_upload_leases to service_role;

create or replace function public.lumno_acquire_media_upload_lease(
  p_user_id uuid,
  p_client_asset_id text,
  p_lease_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_acquired boolean := false;
begin
  if p_user_id is null or p_lease_token is null or
      char_length(coalesce(p_client_asset_id, '')) not between 1 and 120 then
    raise exception 'Invalid media upload lease' using errcode = '22023';
  end if;

  insert into public.lumno_media_upload_leases (
    user_id, client_asset_id, lease_token, expires_at
  ) values (
    p_user_id, p_client_asset_id, p_lease_token, now() + interval '5 minutes'
  )
  on conflict (user_id, client_asset_id) do update set
    lease_token = excluded.lease_token,
    expires_at = excluded.expires_at
  where lumno_media_upload_leases.expires_at <= now()
  returning true into v_acquired;

  return coalesce(v_acquired, false);
end;
$$;

create or replace function public.lumno_release_media_upload_lease(
  p_user_id uuid,
  p_client_asset_id text,
  p_lease_token uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.lumno_media_upload_leases
  where user_id = p_user_id
    and client_asset_id = p_client_asset_id
    and lease_token = p_lease_token;
end;
$$;

revoke all on function public.lumno_acquire_media_upload_lease(uuid, text, uuid)
  from public, anon, authenticated;
revoke all on function public.lumno_release_media_upload_lease(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.lumno_acquire_media_upload_lease(uuid, text, uuid)
  to service_role;
grant execute on function public.lumno_release_media_upload_lease(uuid, text, uuid)
  to service_role;

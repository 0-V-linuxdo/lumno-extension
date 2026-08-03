-- Make account-deletion step-up proofs one-time at the database boundary.
-- Auth sign-out is useful cleanup, but it is not the atomic replay barrier.

create table if not exists public.lumno_delete_step_up_consumptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  step_up_session_id text not null check (char_length(step_up_session_id) between 1 and 200),
  primary_session_id text not null check (char_length(primary_session_id) between 1 and 200),
  authenticated_at timestamptz not null,
  consumed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (user_id, step_up_session_id)
);

create index if not exists lumno_delete_step_up_consumptions_expiry_idx
  on public.lumno_delete_step_up_consumptions (expires_at);

alter table public.lumno_delete_step_up_consumptions enable row level security;
alter table public.lumno_delete_step_up_consumptions force row level security;
revoke all on public.lumno_delete_step_up_consumptions from public, anon, authenticated;
grant all on public.lumno_delete_step_up_consumptions to service_role;

create or replace function public.lumno_consume_delete_step_up_session(
  p_user_id uuid,
  p_step_up_session_id text,
  p_primary_session_id text,
  p_authenticated_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted boolean;
begin
  if p_user_id is null
      or char_length(coalesce(p_step_up_session_id, '')) not between 1 and 200
      or char_length(coalesce(p_primary_session_id, '')) not between 1 and 200
      or p_step_up_session_id = p_primary_session_id
      or p_authenticated_at is null
      or p_authenticated_at < now() - interval '5 minutes 30 seconds'
      or p_authenticated_at > now() + interval '30 seconds' then
    return false;
  end if;

  insert into public.lumno_delete_step_up_consumptions (
    user_id,
    step_up_session_id,
    primary_session_id,
    authenticated_at,
    expires_at
  ) values (
    p_user_id,
    p_step_up_session_id,
    p_primary_session_id,
    p_authenticated_at,
    p_authenticated_at + interval '5 minutes'
  )
  on conflict (user_id, step_up_session_id) do nothing
  returning true into v_inserted;

  return coalesce(v_inserted, false);
end;
$$;

revoke all on function public.lumno_consume_delete_step_up_session(uuid, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.lumno_consume_delete_step_up_session(uuid, text, text, timestamptz)
  to service_role;

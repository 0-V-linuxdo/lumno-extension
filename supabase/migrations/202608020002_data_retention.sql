-- Lumno data retention v1.
-- Keep account-linked daily usage for 24 months, then roll it into a
-- non-identifying monthly metric total before deleting the linked rows.

create table if not exists public.lumno_usage_monthly_totals (
  usage_month date not null check (usage_month = date_trunc('month', usage_month)::date),
  metric text not null check (public.lumno_is_usage_metric(metric)),
  count bigint not null check (count > 0),
  updated_at timestamptz not null default now(),
  primary key (usage_month, metric)
);

create table if not exists public.lumno_maintenance_state (
  job_name text primary key,
  last_completed_at timestamptz not null default '-infinity'::timestamptz
);

insert into public.lumno_maintenance_state (job_name)
values ('data_retention')
on conflict (job_name) do nothing;

create index if not exists lumno_usage_daily_retention_idx
  on public.lumno_usage_daily (usage_day);

create or replace function public.lumno_apply_data_retention(
  p_reference_date date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usage_cutoff date := (p_reference_date - interval '24 months')::date;
  v_monthly_rows integer := 0;
  v_usage_rows integer := 0;
  v_batch_rows integer := 0;
  v_operation_rows integer := 0;
begin
  if p_reference_date is null or p_reference_date > current_date + 1 then
    raise exception 'Invalid retention reference date' using errcode = '22023';
  end if;

  -- Serialize rollups so two simultaneous telemetry uploads cannot count the
  -- same rows twice. The rollup and deletion remain one transaction.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('lumno-data-retention', 0));

  insert into public.lumno_usage_monthly_totals (
    usage_month,
    metric,
    count,
    updated_at
  )
  select
    date_trunc('month', usage_day)::date,
    metric,
    sum(count),
    now()
  from public.lumno_usage_daily
  where usage_day < v_usage_cutoff
  group by date_trunc('month', usage_day)::date, metric
  on conflict (usage_month, metric) do update set
    count = lumno_usage_monthly_totals.count + excluded.count,
    updated_at = now();
  get diagnostics v_monthly_rows = row_count;

  delete from public.lumno_usage_daily
  where usage_day < v_usage_cutoff;
  get diagnostics v_usage_rows = row_count;

  delete from public.lumno_usage_ingest_batches
  where created_at < p_reference_date::timestamptz - interval '30 days';
  get diagnostics v_batch_rows = row_count;

  delete from public.lumno_sync_operations
  where created_at < p_reference_date::timestamptz - interval '90 days';
  get diagnostics v_operation_rows = row_count;

  update public.lumno_maintenance_state
  set last_completed_at = now()
  where job_name = 'data_retention';

  return jsonb_build_object(
    'monthly_rows', v_monthly_rows,
    'usage_rows_deleted', v_usage_rows,
    'batch_rows_deleted', v_batch_rows,
    'operation_rows_deleted', v_operation_rows
  );
end;
$$;

create or replace function public.lumno_maybe_apply_data_retention()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.lumno_maintenance_state
    where job_name = 'data_retention'
      and last_completed_at >= now() - interval '24 hours'
  ) then
    perform public.lumno_apply_data_retention(current_date);
  end if;
  return new;
end;
$$;

drop trigger if exists lumno_usage_retention_after_ingest on public.lumno_usage_ingest_batches;
create trigger lumno_usage_retention_after_ingest
after insert on public.lumno_usage_ingest_batches
for each statement execute function public.lumno_maybe_apply_data_retention();

alter table public.lumno_usage_monthly_totals enable row level security;
alter table public.lumno_usage_monthly_totals force row level security;
alter table public.lumno_maintenance_state enable row level security;
alter table public.lumno_maintenance_state force row level security;

revoke all on public.lumno_usage_monthly_totals from public, anon, authenticated;
revoke all on public.lumno_maintenance_state from public, anon, authenticated;
grant all on public.lumno_usage_monthly_totals to service_role;
grant all on public.lumno_maintenance_state to service_role;

revoke all on function public.lumno_apply_data_retention(date) from public, anon, authenticated;
revoke all on function public.lumno_maybe_apply_data_retention() from public, anon, authenticated;
grant execute on function public.lumno_apply_data_retention(date) to service_role;

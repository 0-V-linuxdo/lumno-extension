-- Keep media usage counters correct when tombstoned rows are later deleted.
-- Account deletion cascades through lumno_assets after media-asset has marked
-- rows deleted; an inactive row must not be subtracted a second time.

create or replace function public.lumno_update_media_usage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_active boolean := false;
  v_new_active boolean := false;
  v_old_kind text;
  v_new_kind text;
  v_old_bytes bigint := 0;
  v_new_bytes bigint := 0;
  v_user_id uuid;
begin
  if tg_op = 'DELETE' then
    v_old_active := old.deleted_at is null;
    v_old_kind := old.asset_kind;
    v_old_bytes := case when v_old_active
      then coalesce(old.byte_size, 0) + coalesce(old.thumbnail_byte_size, 0)
      else 0 end;
    v_user_id := old.user_id;
  else
    if tg_op = 'UPDATE' then
      v_old_active := old.deleted_at is null;
      v_old_kind := old.asset_kind;
      v_old_bytes := case when v_old_active
        then coalesce(old.byte_size, 0) + coalesce(old.thumbnail_byte_size, 0)
        else 0 end;
    end if;
    v_new_active := new.deleted_at is null;
    v_new_kind := new.asset_kind;
    v_new_bytes := case when v_new_active
      then coalesce(new.byte_size, 0) + coalesce(new.thumbnail_byte_size, 0)
      else 0 end;
    v_user_id := new.user_id;
  end if;

  update public.lumno_media_global_usage
  set active_bytes = active_bytes - v_old_bytes + v_new_bytes
  where singleton;

  update public.lumno_media_usage
  set active_count = active_count
        - case when v_old_active then 1 else 0 end
        + case when v_new_active then 1 else 0 end,
      active_wallpaper_count = active_wallpaper_count
        - case when v_old_active and v_old_kind = 'wallpaper' then 1 else 0 end
        + case when v_new_active and v_new_kind = 'wallpaper' then 1 else 0 end,
      active_shortcut_icon_count = active_shortcut_icon_count
        - case when v_old_active and v_old_kind = 'shortcut_icon' then 1 else 0 end
        + case when v_new_active and v_new_kind = 'shortcut_icon' then 1 else 0 end,
      active_bytes = active_bytes - v_old_bytes + v_new_bytes
  where user_id = v_user_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.lumno_update_media_usage() from public, anon, authenticated;
grant execute on function public.lumno_update_media_usage() to service_role;

-- Repair any drift introduced by the previous trigger version. This is a
-- one-time maintenance pass; normal writes remain counter-based and do not
-- scan lumno_assets.
insert into public.lumno_media_usage (
  user_id,
  active_count,
  active_wallpaper_count,
  active_shortcut_icon_count,
  active_bytes
)
select
  user_id,
  count(*)::integer,
  count(*) filter (where asset_kind = 'wallpaper')::integer,
  count(*) filter (where asset_kind = 'shortcut_icon')::integer,
  coalesce(sum(byte_size + thumbnail_byte_size), 0)::bigint
from public.lumno_assets
where deleted_at is null
group by user_id
on conflict (user_id) do update set
  active_count = excluded.active_count,
  active_wallpaper_count = excluded.active_wallpaper_count,
  active_shortcut_icon_count = excluded.active_shortcut_icon_count,
  active_bytes = excluded.active_bytes;

delete from public.lumno_media_usage usage
where not exists (
  select 1
  from public.lumno_assets asset
  where asset.user_id = usage.user_id
    and asset.deleted_at is null
);

update public.lumno_media_global_usage
set active_bytes = coalesce((
  select sum(byte_size + thumbnail_byte_size)
  from public.lumno_assets
  where deleted_at is null
), 0)
where singleton;

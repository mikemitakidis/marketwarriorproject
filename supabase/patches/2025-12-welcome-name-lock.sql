-- MarketWarrior patch: Certificate name lock + protected profile fields

-- 1) Add column for locking the certificate name
alter table public.user_profiles
  add column if not exists full_name_locked boolean not null default false;

-- If someone already completed Welcome in the past, lock their name immediately
update public.user_profiles
set full_name_locked = true
where welcome_completed = true
  and full_name_locked = false;

-- 2) Protect sensitive columns using a trigger (column-level enforcement)
create or replace function public.protect_user_profiles()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    if new.role is distinct from old.role then
      raise exception 'role is protected';
    end if;
    if new.has_paid is distinct from old.has_paid then
      raise exception 'has_paid is protected';
    end if;
    if new.paid_at is distinct from old.paid_at then
      raise exception 'paid_at is protected';
    end if;
    if new.referred_by_code is distinct from old.referred_by_code then
      raise exception 'referred_by_code is protected';
    end if;

    if old.full_name_locked and (new.full_name is distinct from old.full_name) then
      raise exception 'full_name is locked';
    end if;
    if old.full_name_locked and (new.full_name_locked is distinct from old.full_name_locked) then
      raise exception 'full_name_locked is locked';
    end if;
  end if;

  return new;
end; $$;

drop trigger if exists trg_protect_user_profiles on public.user_profiles;
create trigger trg_protect_user_profiles
before update on public.user_profiles
for each row execute function public.protect_user_profiles();

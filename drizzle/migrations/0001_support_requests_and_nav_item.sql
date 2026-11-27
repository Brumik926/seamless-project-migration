
alter table public.user_settings add column nav_item text not null default 'karty'
  check (nav_item in ('karty','mafin','prijemcovia','trvale-prikazy'));
grant update (nav_item) on public.user_settings to authenticated;

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  kind text not null check (kind in ('callback','meeting')),
  phone text not null check (phone ~ '^\+?[0-9 ]{6,20}$'),
  preferred_at timestamptz not null,
  topic text not null default 'ine' check (topic in ('ucty','karty','platby','uvery','ine')),
  note text check (note is null or length(note) <= 300),
  status text not null default 'open' check (status in ('open','cancelled')),
  created_at timestamptz not null default now()
);
create index support_requests_user_idx on public.support_requests(user_id, created_at desc);
grant select, insert on public.support_requests to authenticated;
grant update (status) on public.support_requests to authenticated;
grant all on public.support_requests to service_role;
alter table public.support_requests enable row level security;
create policy "Own support read" on public.support_requests for select to authenticated using (user_id = (select auth.uid()));
create policy "Own support insert" on public.support_requests for insert to authenticated with check (user_id = (select auth.uid()) and status = 'open');
create policy "Own support update" on public.support_requests for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.support_requests_validate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.preferred_at < now() then raise exception 'INVALID_DATE'; end if;
    perform public._notify(new.user_id, 'info',
      case when new.kind = 'callback' then 'Žiadosť o spätné zavolanie prijatá' else 'Žiadosť o stretnutie prijatá' end,
      'Termín: ' || to_char(new.preferred_at at time zone 'Europe/Bratislava', 'DD.MM.YYYY HH24:MI') || ', telefón ' || new.phone || '.',
      '/kontakty');
  end if;
  return new;
end $$;
create trigger support_requests_before before insert on public.support_requests for each row execute function public.support_requests_validate();
revoke execute on function public.support_requests_validate() from public, anon, authenticated;

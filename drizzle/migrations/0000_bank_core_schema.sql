
-- ============ Helpers ============
create or replace function public.bank_today() returns date
language sql stable set search_path = public as $$
  select (now() at time zone 'Europe/Bratislava')::date
$$;

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create or replace function public.normalize_iban(p text) returns text
language sql immutable set search_path = public as $$
  select upper(regexp_replace(coalesce(p, ''), '\s', '', 'g'))
$$;

create or replace function public.is_valid_iban(p text) returns boolean
language plpgsql immutable set search_path = public as $$
declare v text := public.normalize_iban(p); r text; c text; d text; m int := 0; i int; j int;
begin
  if length(v) < 15 or length(v) > 34 or v !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]+$' then return false; end if;
  if substr(v,1,2) in ('SK','CZ') and length(v) <> 24 then return false; end if;
  r := substr(v,5) || substr(v,1,4);
  for i in 1..length(r) loop
    c := substr(r,i,1);
    if c ~ '[0-9]' then d := c; else d := (ascii(c) - 55)::text; end if;
    for j in 1..length(d) loop
      m := (m * 10 + substr(d,j,1)::int) % 97;
    end loop;
  end loop;
  return m = 1;
end $$;

-- ============ profiles ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (length(full_name) <= 100),
  email text,
  phone text check (phone is null or length(phone) <= 30),
  street text check (street is null or length(street) <= 120),
  city text check (city is null or length(city) <= 80),
  zip text check (zip is null or length(zip) <= 10),
  birth_date date,
  client_number text not null default lpad((floor(random()*90000000)+10000000)::bigint::text, 8, '0'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant update (full_name, phone, street, city, zip, birth_date) on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Own profile read" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "Own profile update" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- ============ user_settings ============
create table public.user_settings (
  user_id uuid primary key,
  theme text not null default 'dark' check (theme in ('dark','light','system')),
  language text not null default 'sk' check (language in ('sk','en')),
  hide_balances boolean not null default false,
  notify_payments boolean not null default true,
  notify_cards boolean not null default true,
  notify_marketing boolean not null default false,
  show_cards boolean not null default true,
  show_savings boolean not null default true,
  show_quick_payment boolean not null default true,
  show_spending boolean not null default true,
  show_rates boolean not null default true,
  updated_at timestamptz not null default now()
);
grant select on public.user_settings to authenticated;
grant update (theme, language, hide_balances, notify_payments, notify_cards, notify_marketing, show_cards, show_savings, show_quick_payment, show_spending, show_rates) on public.user_settings to authenticated;
grant all on public.user_settings to service_role;
alter table public.user_settings enable row level security;
create policy "Own settings read" on public.user_settings for select to authenticated using (user_id = (select auth.uid()));
create policy "Own settings update" on public.user_settings for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create trigger user_settings_updated before update on public.user_settings for each row execute function public.set_updated_at();

-- ============ accounts ============
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null check (length(name) between 1 and 60),
  iban text not null unique,
  balance numeric(14,2) not null default 0 check (balance >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  account_type text not null default 'current' check (account_type in ('current','savings')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index accounts_user_idx on public.accounts(user_id);
grant select on public.accounts to authenticated;
grant all on public.accounts to service_role;
alter table public.accounts enable row level security;
create policy "Own accounts read" on public.accounts for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.generate_sk_iban() returns text
language plpgsql volatile set search_path = public as $$
declare acct text; bban text; r text; m int; i int; chk text; result text;
begin
  loop
    acct := lpad((floor(random()*8999999999) + 1000000000)::bigint::text, 10, '0');
    bban := '9900' || '000000' || acct;
    r := bban || '282000';
    m := 0;
    for i in 1..length(r) loop m := (m * 10 + substr(r,i,1)::int) % 97; end loop;
    chk := lpad((98 - m)::text, 2, '0');
    result := 'SK' || chk || bban;
    exit when not exists (select 1 from public.accounts where iban = result);
  end loop;
  return result;
end $$;

-- ============ cards ============
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null check (length(name) between 1 and 40),
  holder_name text not null default '',
  masked_number text not null,
  brand text not null check (brand in ('VISA','Mastercard')),
  card_type text not null check (card_type in ('debit','credit')),
  credit_limit numeric(14,2),
  credit_available numeric(14,2),
  expiry text not null,
  status text not null default 'active' check (status in ('active','blocked')),
  internet_payments boolean not null default true,
  contactless boolean not null default true,
  design text not null default 'forest',
  created_at timestamptz not null default now()
);
create index cards_user_idx on public.cards(user_id);
grant select on public.cards to authenticated;
grant update (name, status, internet_payments, contactless) on public.cards to authenticated;
grant all on public.cards to service_role;
alter table public.cards enable row level security;
create policy "Own cards read" on public.cards for select to authenticated using (user_id = (select auth.uid()));
create policy "Own cards update" on public.cards for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ============ card_limits ============
create table public.card_limits (
  card_id uuid primary key references public.cards(id) on delete cascade,
  user_id uuid not null,
  atm_daily numeric(10,2) not null default 500 check (atm_daily between 0 and 5000),
  pos_daily numeric(10,2) not null default 2000 check (pos_daily between 0 and 10000),
  internet_daily numeric(10,2) not null default 1000 check (internet_daily between 0 and 10000),
  updated_at timestamptz not null default now()
);
grant select on public.card_limits to authenticated;
grant update (atm_daily, pos_daily, internet_daily) on public.card_limits to authenticated;
grant all on public.card_limits to service_role;
alter table public.card_limits enable row level security;
create policy "Own limits read" on public.card_limits for select to authenticated using (user_id = (select auth.uid()));
create policy "Own limits update" on public.card_limits for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create trigger card_limits_updated before update on public.card_limits for each row execute function public.set_updated_at();

-- ============ standing_orders ============
create table public.standing_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null check (length(name) between 1 and 60),
  recipient_name text not null check (length(recipient_name) between 1 and 70),
  iban text not null check (public.is_valid_iban(iban)),
  amount numeric(14,2) not null check (amount > 0 and amount <= 100000),
  frequency text not null default 'monthly' check (frequency in ('weekly','monthly','quarterly','yearly')),
  next_date date not null,
  end_date date,
  variable_symbol text check (variable_symbol is null or variable_symbol ~ '^[0-9]{1,10}$'),
  constant_symbol text check (constant_symbol is null or constant_symbol ~ '^[0-9]{1,4}$'),
  specific_symbol text check (specific_symbol is null or specific_symbol ~ '^[0-9]{1,10}$'),
  message text check (message is null or length(message) <= 140),
  is_active boolean not null default true,
  last_executed_at timestamptz,
  created_at timestamptz not null default now()
);
create index standing_orders_user_idx on public.standing_orders(user_id);
grant select, insert, update, delete on public.standing_orders to authenticated;
grant all on public.standing_orders to service_role;
alter table public.standing_orders enable row level security;
create policy "Own standing orders read" on public.standing_orders for select to authenticated using (user_id = (select auth.uid()));
create policy "Own standing orders insert" on public.standing_orders for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Own standing orders update" on public.standing_orders for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own standing orders delete" on public.standing_orders for delete to authenticated using (user_id = (select auth.uid()));

-- ============ transactions ============
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  account_id uuid not null references public.accounts(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'EUR',
  counterparty_name text not null default '',
  counterparty_iban text,
  tx_type text not null check (tx_type in ('transfer_in','transfer_out','card','standing_order','internal')),
  category text not null default 'ine' check (category in ('potraviny','nakupy','cestovanie','byvanie','doprava','zabava','zdravie','prijem','prevody','sporenie','ine')),
  variable_symbol text check (variable_symbol is null or variable_symbol ~ '^[0-9]{1,10}$'),
  constant_symbol text check (constant_symbol is null or constant_symbol ~ '^[0-9]{1,4}$'),
  specific_symbol text check (specific_symbol is null or specific_symbol ~ '^[0-9]{1,10}$'),
  message text check (message is null or length(message) <= 140),
  payer_reference text check (payer_reference is null or length(payer_reference) <= 35),
  status text not null default 'completed' check (status in ('completed','scheduled','failed','cancelled')),
  execution_date date not null default public.bank_today(),
  booked_at timestamptz not null default now(),
  balance_after numeric(14,2),
  co2_kg numeric(8,2),
  card_id uuid references public.cards(id) on delete set null,
  standing_order_id uuid references public.standing_orders(id) on delete set null,
  idempotency_key uuid,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index transactions_user_booked_idx on public.transactions(user_id, booked_at desc);
create index transactions_account_idx on public.transactions(account_id, booked_at desc);
create index transactions_scheduled_idx on public.transactions(user_id, execution_date) where status = 'scheduled';
grant select on public.transactions to authenticated;
grant update (category) on public.transactions to authenticated;
grant all on public.transactions to service_role;
alter table public.transactions enable row level security;
create policy "Own transactions read" on public.transactions for select to authenticated using (user_id = (select auth.uid()));
create policy "Own transactions update" on public.transactions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ============ recipients ============
create table public.recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null check (length(name) between 1 and 70),
  iban text not null check (public.is_valid_iban(iban)),
  note text check (note is null or length(note) <= 140),
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);
create index recipients_user_idx on public.recipients(user_id);
grant select, insert, update, delete on public.recipients to authenticated;
grant all on public.recipients to service_role;
alter table public.recipients enable row level security;
create policy "Own recipients read" on public.recipients for select to authenticated using (user_id = (select auth.uid()));
create policy "Own recipients insert" on public.recipients for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Own recipients update" on public.recipients for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own recipients delete" on public.recipients for delete to authenticated using (user_id = (select auth.uid()));

-- ============ payment_templates ============
create table public.payment_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null check (length(name) between 1 and 60),
  recipient_name text not null check (length(recipient_name) between 1 and 70),
  iban text not null check (public.is_valid_iban(iban)),
  amount numeric(14,2) check (amount is null or (amount > 0 and amount <= 100000)),
  variable_symbol text check (variable_symbol is null or variable_symbol ~ '^[0-9]{1,10}$'),
  constant_symbol text check (constant_symbol is null or constant_symbol ~ '^[0-9]{1,4}$'),
  specific_symbol text check (specific_symbol is null or specific_symbol ~ '^[0-9]{1,10}$'),
  message text check (message is null or length(message) <= 140),
  created_at timestamptz not null default now()
);
create index payment_templates_user_idx on public.payment_templates(user_id);
grant select, insert, update, delete on public.payment_templates to authenticated;
grant all on public.payment_templates to service_role;
alter table public.payment_templates enable row level security;
create policy "Own templates read" on public.payment_templates for select to authenticated using (user_id = (select auth.uid()));
create policy "Own templates insert" on public.payment_templates for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Own templates update" on public.payment_templates for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own templates delete" on public.payment_templates for delete to authenticated using (user_id = (select auth.uid()));

-- ============ notifications ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null default 'info' check (kind in ('payment','card','security','info','standing_order')),
  title text not null,
  body text not null default '',
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
grant select, delete on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "Own notifications read" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "Own notifications update" on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own notifications delete" on public.notifications for delete to authenticated using (user_id = (select auth.uid()));

-- ============ IBAN normalization + ownership triggers ============
create or replace function public.normalize_iban_trigger() returns trigger
language plpgsql set search_path = public as $$
begin new.iban := public.normalize_iban(new.iban); return new; end $$;

create trigger recipients_norm before insert or update on public.recipients for each row execute function public.normalize_iban_trigger();
create trigger templates_norm before insert or update on public.payment_templates for each row execute function public.normalize_iban_trigger();

create or replace function public.validate_standing_order() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.iban := public.normalize_iban(new.iban);
  if not exists (select 1 from public.accounts where id = new.account_id and user_id = new.user_id) then
    raise exception 'ACCOUNT_NOT_FOUND';
  end if;
  if exists (select 1 from public.accounts where id = new.account_id and iban = new.iban) then
    raise exception 'SAME_ACCOUNT';
  end if;
  if (tg_op = 'INSERT' or new.next_date is distinct from old.next_date) and new.next_date < public.bank_today() then
    raise exception 'INVALID_DATE';
  end if;
  if new.end_date is not null and new.end_date < new.next_date then
    raise exception 'INVALID_END_DATE';
  end if;
  return new;
end $$;
create trigger standing_orders_validate before insert or update on public.standing_orders for each row execute function public.validate_standing_order();

-- ============ Notifications helper ============
create or replace function public._notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text default null) returns void
language plpgsql security definer set search_path = public as $$
declare s public.user_settings%rowtype;
begin
  select * into s from public.user_settings where user_id = p_user;
  if p_kind in ('payment','standing_order') and coalesce(s.notify_payments, true) = false then return; end if;
  if p_kind = 'card' and coalesce(s.notify_cards, true) = false then return; end if;
  insert into public.notifications(user_id, kind, title, body, link) values (p_user, p_kind, p_title, p_body, p_link);
end $$;

create or replace function public._fmt_eur(p numeric) returns text
language sql immutable set search_path = public as $$
  select replace(to_char(p, 'FM999999990.00'), '.', ',') || ' EUR'
$$;

-- Card notifications
create or replace function public.cards_after_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    perform public._notify(new.user_id, 'card',
      case when new.status = 'blocked' then 'Karta bola zablokovaná' else 'Karta bola odblokovaná' end,
      new.name || ' (' || new.masked_number || ')', '/karty/' || new.id);
  end if;
  if new.internet_payments is distinct from old.internet_payments then
    perform public._notify(new.user_id, 'card',
      case when new.internet_payments then 'Internetové platby zapnuté' else 'Internetové platby vypnuté' end,
      new.name, '/karty/' || new.id);
  end if;
  return new;
end $$;
create trigger cards_notify after update on public.cards for each row execute function public.cards_after_update();

create or replace function public.card_limits_after_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.cards%rowtype;
begin
  if (new.atm_daily, new.pos_daily, new.internet_daily) is distinct from (old.atm_daily, old.pos_daily, old.internet_daily) then
    select * into c from public.cards where id = new.card_id;
    perform public._notify(new.user_id, 'card', 'Limity karty boli zmenené',
      c.name || ': výber ' || public._fmt_eur(new.atm_daily) || ', platby ' || public._fmt_eur(new.pos_daily) || ', internet ' || public._fmt_eur(new.internet_daily),
      '/karty/' || new.card_id);
  end if;
  return new;
end $$;
create trigger card_limits_notify after update on public.card_limits for each row execute function public.card_limits_after_update();

-- ============ Settlement core ============
create or replace function public._settle_outgoing(p_tx_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  t public.transactions%rowtype;
  a public.accounts%rowtype;
  d public.accounts%rowtype;
  nb numeric; nb2 numeric; sender text; is_internal boolean := false;
begin
  select * into t from public.transactions where id = p_tx_id and status = 'scheduled' and direction = 'out' for update;
  if not found then return false; end if;
  select * into a from public.accounts where id = t.account_id for update;
  if a.balance < t.amount then
    update public.transactions set status = 'failed', booked_at = now() where id = t.id;
    perform public._notify(t.user_id, case when t.standing_order_id is null then 'payment' else 'standing_order' end,
      'Platba nebola vykonaná', 'Nedostatok prostriedkov na úhradu ' || public._fmt_eur(t.amount) || ' pre ' || t.counterparty_name || '.', '/transakcia/' || t.id);
    return false;
  end if;

  select * into d from public.accounts where iban = t.counterparty_iban and id <> a.id for update;
  update public.accounts set balance = balance - t.amount where id = a.id returning balance into nb;

  if d.id is not null then
    is_internal := d.user_id = t.user_id;
    update public.accounts set balance = balance + t.amount where id = d.id returning balance into nb2;
    select full_name into sender from public.profiles where id = t.user_id;
    insert into public.transactions(user_id, account_id, direction, amount, counterparty_name, counterparty_iban, tx_type, category,
      variable_symbol, constant_symbol, specific_symbol, message, status, execution_date, booked_at, balance_after)
    values (d.user_id, d.id, 'in', t.amount,
      case when is_internal then a.name else coalesce(nullif(sender, ''), a.name) end,
      a.iban,
      case when is_internal then 'internal' else 'transfer_in' end,
      case when is_internal then 'sporenie' else 'prijem' end,
      t.variable_symbol, t.constant_symbol, t.specific_symbol, t.message, 'completed', public.bank_today(), now(), nb2);
    if not is_internal then
      perform public._notify(d.user_id, 'payment', 'Prijatá platba',
        public._fmt_eur(t.amount) || ' od ' || coalesce(nullif(sender, ''), a.name) || '.', null);
    end if;
  end if;

  update public.transactions
     set status = 'completed', booked_at = now(), balance_after = nb,
         tx_type = case when is_internal then 'internal' else t.tx_type end,
         category = case when is_internal then 'sporenie' else t.category end
   where id = t.id;

  perform public._notify(t.user_id, case when t.standing_order_id is null then 'payment' else 'standing_order' end,
    case when t.standing_order_id is null then 'Platba odoslaná' else 'Trvalý príkaz vykonaný' end,
    public._fmt_eur(t.amount) || ' pre ' || t.counterparty_name || '. Zostatok: ' || public._fmt_eur(nb) || '.',
    '/transakcia/' || t.id);
  return true;
end $$;

-- ============ Public RPC: execute payment ============
create or replace function public.execute_payment(
  p_account_id uuid,
  p_recipient_name text,
  p_iban text,
  p_amount numeric,
  p_execution_date date,
  p_idempotency_key uuid,
  p_variable_symbol text default null,
  p_constant_symbol text default null,
  p_specific_symbol text default null,
  p_message text default null,
  p_payer_reference text default null,
  p_category text default 'prevody'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  a public.accounts%rowtype;
  ex record;
  v_iban text := public.normalize_iban(p_iban);
  v_name text := btrim(coalesce(p_recipient_name, ''));
  v_date date := coalesce(p_execution_date, public.bank_today());
  v_vs text := nullif(btrim(coalesce(p_variable_symbol, '')), '');
  v_ks text := nullif(btrim(coalesce(p_constant_symbol, '')), '');
  v_ss text := nullif(btrim(coalesce(p_specific_symbol, '')), '');
  v_msg text := nullif(btrim(coalesce(p_message, '')), '');
  v_ref text := nullif(btrim(coalesce(p_payer_reference, '')), '');
  v_cat text := coalesce(p_category, 'prevody');
  v_tx uuid; v_status text; v_bal numeric;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_idempotency_key is null then raise exception 'MISSING_IDEMPOTENCY_KEY'; end if;

  -- Lock the payer account first: serializes concurrent submissions for this account.
  select * into a from public.accounts where id = p_account_id and user_id = uid for update;
  if not found then raise exception 'ACCOUNT_NOT_FOUND'; end if;

  select id, status into ex from public.transactions where user_id = uid and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('transaction_id', ex.id, 'status', ex.status, 'duplicate', true, 'balance', a.balance);
  end if;

  if p_amount is null or p_amount <= 0 or p_amount > 100000 or round(p_amount, 2) <> p_amount then raise exception 'INVALID_AMOUNT'; end if;
  if not public.is_valid_iban(v_iban) then raise exception 'INVALID_IBAN'; end if;
  if v_iban = a.iban then raise exception 'SAME_ACCOUNT'; end if;
  if length(v_name) < 1 or length(v_name) > 70 then raise exception 'INVALID_RECIPIENT'; end if;
  if v_vs is not null and v_vs !~ '^[0-9]{1,10}$' then raise exception 'INVALID_VS'; end if;
  if v_ks is not null and v_ks !~ '^[0-9]{1,4}$' then raise exception 'INVALID_KS'; end if;
  if v_ss is not null and v_ss !~ '^[0-9]{1,10}$' then raise exception 'INVALID_SS'; end if;
  if v_msg is not null and length(v_msg) > 140 then raise exception 'INVALID_MESSAGE'; end if;
  if v_ref is not null and length(v_ref) > 35 then raise exception 'INVALID_REFERENCE'; end if;
  if v_cat not in ('potraviny','nakupy','cestovanie','byvanie','doprava','zabava','zdravie','prevody','sporenie','ine') then raise exception 'INVALID_CATEGORY'; end if;
  if v_date < public.bank_today() or v_date > public.bank_today() + 365 then raise exception 'INVALID_DATE'; end if;
  if v_date = public.bank_today() and a.balance < p_amount then raise exception 'INSUFFICIENT_FUNDS'; end if;

  insert into public.transactions(user_id, account_id, direction, amount, counterparty_name, counterparty_iban, tx_type, category,
    variable_symbol, constant_symbol, specific_symbol, message, payer_reference, status, execution_date, idempotency_key)
  values (uid, a.id, 'out', p_amount, v_name, v_iban, 'transfer_out', v_cat, v_vs, v_ks, v_ss, v_msg, v_ref, 'scheduled', v_date, p_idempotency_key)
  returning id into v_tx;

  if v_date = public.bank_today() then
    perform public._settle_outgoing(v_tx);
  else
    perform public._notify(uid, 'payment', 'Platba naplánovaná',
      public._fmt_eur(p_amount) || ' pre ' || v_name || ' dňa ' || to_char(v_date, 'DD.MM.YYYY') || '.', '/transakcia/' || v_tx);
  end if;

  select status into v_status from public.transactions where id = v_tx;
  select balance into v_bal from public.accounts where id = a.id;
  return jsonb_build_object('transaction_id', v_tx, 'status', v_status, 'duplicate', false, 'balance', v_bal);
exception
  when unique_violation then
    select id, status into ex from public.transactions where user_id = uid and idempotency_key = p_idempotency_key;
    return jsonb_build_object('transaction_id', ex.id, 'status', ex.status, 'duplicate', true, 'balance', null);
end $$;

create or replace function public.cancel_scheduled_payment(p_tx_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  update public.transactions set status = 'cancelled' where id = p_tx_id and user_id = uid and status = 'scheduled';
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- Process due scheduled payments and standing orders for the calling user.
create or replace function public.process_due_items() returns integer
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); t record; so public.standing_orders%rowtype; v_tx uuid; n int := 0; guard int;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  for t in select id from public.transactions
           where user_id = uid and status = 'scheduled' and direction = 'out' and execution_date <= public.bank_today()
           order by execution_date, created_at loop
    perform public._settle_outgoing(t.id);
    n := n + 1;
  end loop;

  for so in select * from public.standing_orders
            where user_id = uid and is_active and next_date <= public.bank_today()
            order by next_date for update loop
    guard := 0;
    while so.next_date <= public.bank_today() and (so.end_date is null or so.next_date <= so.end_date) and guard < 24 loop
      insert into public.transactions(user_id, account_id, direction, amount, counterparty_name, counterparty_iban, tx_type, category,
        variable_symbol, constant_symbol, specific_symbol, message, status, execution_date, standing_order_id)
      values (uid, so.account_id, 'out', so.amount, so.recipient_name, so.iban, 'standing_order', 'prevody',
        so.variable_symbol, so.constant_symbol, so.specific_symbol, so.message, 'scheduled', so.next_date, so.id)
      returning id into v_tx;
      perform public._settle_outgoing(v_tx);
      n := n + 1; guard := guard + 1;
      so.next_date := case so.frequency
        when 'weekly' then so.next_date + 7
        when 'monthly' then (so.next_date + interval '1 month')::date
        when 'quarterly' then (so.next_date + interval '3 months')::date
        else (so.next_date + interval '1 year')::date end;
    end loop;
    update public.standing_orders
       set next_date = so.next_date,
           last_executed_at = now(),
           is_active = (so.end_date is null or so.next_date <= so.end_date)
     where id = so.id;
  end loop;
  return n;
end $$;

-- ============ Data seeding on signup ============
create or replace function public.seed_demo_data(p_user uuid, p_name text, p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_cur uuid; v_sav uuid; v_cur_iban text; v_sav_iban text; v_debit uuid; v_credit uuid; today date := public.bank_today();
begin
  insert into public.profiles(id, full_name, email) values (p_user, coalesce(p_name, ''), p_email) on conflict (id) do nothing;
  insert into public.user_settings(user_id) values (p_user) on conflict (user_id) do nothing;

  v_cur_iban := public.generate_sk_iban();
  insert into public.accounts(user_id, name, iban, balance, account_type, is_primary)
  values (p_user, 'Bežný účet', v_cur_iban, 1140.00, 'current', true) returning id into v_cur;
  v_sav_iban := public.generate_sk_iban();
  insert into public.accounts(user_id, name, iban, balance, account_type, is_primary)
  values (p_user, 'Sporiaci účet', v_sav_iban, 1660.00, 'savings', false) returning id into v_sav;

  insert into public.cards(user_id, account_id, name, holder_name, masked_number, brand, card_type, expiry, design)
  values (p_user, v_cur, 'Moja debetná karta', upper(coalesce(p_name, '')), '4921 55** **** ' || lpad((floor(random()*9000)+1000)::int::text, 4, '0'),
          'VISA', 'debit', to_char(today + interval '3 years', 'MM/YY'), 'forest') returning id into v_debit;
  insert into public.cards(user_id, account_id, name, holder_name, masked_number, brand, card_type, credit_limit, credit_available, expiry, design)
  values (p_user, v_cur, 'Moja kreditná karta', upper(coalesce(p_name, '')), '5375 11** **** ' || lpad((floor(random()*9000)+1000)::int::text, 4, '0'),
          'Mastercard', 'credit', 5000, 4950, to_char(today + interval '2 years', 'MM/YY'), 'mono') returning id into v_credit;
  insert into public.card_limits(card_id, user_id) values (v_debit, p_user), (v_credit, p_user);

  insert into public.transactions(user_id, account_id, direction, amount, counterparty_name, counterparty_iban, tx_type, category, message, status, execution_date, booked_at, co2_kg, card_id)
  select p_user, v_cur, v.d, v.a, v.n, v.ib, v.t, v.c, v.m, 'completed', today - v.days,
         (today - v.days)::timestamp + interval '9 hours' + (v.days % 7) * interval '73 minutes',
         v.co2, case when v.t = 'card' then v_debit end
  from (values
    (1,  'in'::text,  110.00::numeric, 'Mária Vzorová'::text,       'SK1699000000004943859575'::text, 'transfer_in'::text,  'prijem'::text,     'Vrátenie za lístky'::text, null::numeric),
    (1,  'in',  185.00, 'Ján Nový',               'SK7499000000002796742288', 'transfer_in',  'prijem',     null, null),
    (1,  'in',  113.00, 'Peter Novák',            'SK7399000000002302595691', 'transfer_in',  'prijem',     null, null),
    (1,  'out', 101.00, 'Ing. Peter Novák',       'SK7399000000002302595691', 'transfer_out', 'prevody',    'Splátka pôžičky', null),
    (2,  'out', 105.00, 'ŽELEZIARSTVO KLINEC',    null,                       'card',         'nakupy',     null, 20.95),
    (14, 'in',  117.00, 'Anna Petrovická',        'SK1099000000002180419893', 'transfer_in',  'prijem',     null, null),
    (18, 'in',  188.00, 'Jana Pekná',             'SK4799000000000301026767', 'transfer_in',  'prijem',     null, null),
    (18, 'out', 649.00, 'Fresh Market',           null,                       'card',         'potraviny',  null, 20.95),
    (19, 'in',  118.00, 'Jozef Vzorový',          'SK7299000000008980544025', 'transfer_in',  'prijem',     null, null),
    (25, 'out', 153.00, 'Obuv Kroky',             null,                       'card',         'nakupy',     null, 20.95),
    (28, 'out', 128.00, 'POTRAVINY MALINA',       null,                       'card',         'potraviny',  null, 20.95),
    (28, 'out', 173.00, 'Mestský market',         null,                       'card',         'potraviny',  null, 20.95),
    (29, 'in',  107.00, 'Klaudia Kováčová',       'SK6999000000001824296038', 'transfer_in',  'prijem',     null, null),
    (30, 'in',  139.00, 'Tomáš Lipták',           'SK7399000000009549738649', 'transfer_in',  'prijem',     null, null),
    (32, 'out', 450.00, 'Bytové družstvo Lipa',   'SK1099000000002180419893', 'transfer_out', 'byvanie',    'Nájomné', null),
    (35, 'out',  89.90, 'Air Tatranská',          null,                       'card',         'cestovanie', null, 48.10),
    (38, 'out',  42.50, 'Lekáreň Harmónia',       null,                       'card',         'zdravie',    null, 3.20),
    (40, 'in', 1450.00, 'Demo Company s.r.o.',    'SK6399000000000162042648', 'transfer_in',  'prijem',     'Mzda', null),
    (45, 'out',  64.00, 'Kino Lumière',           null,                       'card',         'zabava',     null, 4.10),
    (48, 'out',  58.20, 'Čerpacia stanica Orol',  null,                       'card',         'doprava',    null, 31.40),
    (55, 'out', 312.00, 'Hotel Panoráma',         null,                       'card',         'cestovanie', null, 25.70),
    (70, 'in', 1450.00, 'Build Company s.r.o.',    'SK6399000000000162042648', 'transfer_in',  'prijem',     'Mzda', null),
    (75, 'out', 450.00, 'Bytové družstvo Lipa',   'SK1099000000002180419893', 'transfer_out', 'byvanie',    'Nájomné', null),
    (80, 'out', 236.40, 'Fresh Market',           null,                       'card',         'potraviny',  null, 20.95)
  ) as v(days, d, a, n, ib, t, c, m, co2);

  insert into public.recipients(user_id, name, iban, is_favorite) values
    (p_user, 'Mária Vozárová', 'SK1699000000004943859575', true),
    (p_user, 'Ján Nový', 'SK7499000000002796742288', true),
    (p_user, 'Bytové družstvo Lipa', 'SK1099000000002180419893', true),
    (p_user, 'Build Company s.r.o.', 'SK6399000000000162042648', false),
    (p_user, 'Peter Novák', 'SK7399000000002302595691', false),
    (p_user, 'Jana Horáková (CZ)', 'CZ6508000000192000145399', false);

  insert into public.payment_templates(user_id, name, recipient_name, iban, amount, variable_symbol, message) values
    (p_user, 'Nájomné', 'Bytové družstvo Lipa', 'SK1099000000002180419893', 450.00, '2026110', 'Nájomné'),
    (p_user, 'Internet', 'NetSpeed s.r.o.', 'SK3499000000006158461338', 19.99, '88112233', null);

  insert into public.standing_orders(user_id, account_id, name, recipient_name, iban, amount, frequency, next_date, message) values
    (p_user, v_cur, 'Mesačné sporenie', 'Sporiaci účet', v_sav_iban, 50.00, 'monthly', (date_trunc('month', today) + interval '1 month')::date, 'Sporenie'),
    (p_user, v_cur, 'Nájomné', 'Bytové družstvo Lipa', 'SK1099000000002180419893', 450.00, 'monthly',
      case when extract(day from today) < 15 then (date_trunc('month', today) + interval '14 days')::date
           else (date_trunc('month', today) + interval '1 month 14 days')::date end, 'Nájomné');

  insert into public.notifications(user_id, kind, title, body, link) values
    (p_user, 'info', 'Vitajte vo Tatra banky', null),
    (p_user, 'card', 'Vaše karty sú pripravené', 'Debetnú aj kreditnú kartu môžete spravovať v sekcii Karty.', '/karty'),
    (p_user, 'security', 'Bezpečnostný tip', 'Tatra banka vás nikdy nebude žiadať o heslo e-mailom ani telefonicky.', null);
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.seed_demo_data(new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ Function privileges ============
revoke execute on function public._settle_outgoing(uuid) from public, anon, authenticated;
revoke execute on function public._notify(uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.seed_demo_data(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.generate_sk_iban() from public, anon, authenticated;
revoke execute on function public.cards_after_update() from public, anon, authenticated;
revoke execute on function public.card_limits_after_update() from public, anon, authenticated;
revoke execute on function public.validate_standing_order() from public, anon, authenticated;
revoke execute on function public.execute_payment(uuid, text, text, numeric, date, uuid, text, text, text, text, text, text) from public, anon;
revoke execute on function public.cancel_scheduled_payment(uuid) from public, anon;
revoke execute on function public.process_due_items() from public, anon;
grant execute on function public.execute_payment(uuid, text, text, numeric, date, uuid, text, text, text, text, text, text) to authenticated;
grant execute on function public.cancel_scheduled_payment(uuid) to authenticated;
grant execute on function public.process_due_items() to authenticated;
grant execute on function public.is_valid_iban(text) to authenticated;
grant execute on function public.bank_today() to authenticated;

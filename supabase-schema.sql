-- Yesterday Tomorrow — Supabase Schema
-- Run this in the Supabase SQL Editor (supabase.com → your project → SQL Editor → New query)

-- Sales
create table if not exists sales (
  id text primary key,
  date text not null,
  channel text not null,
  description text not null,
  amount numeric not null default 0,
  item_cost numeric not null default 0,
  created_at timestamptz default now()
);

-- Expenses
create table if not exists expenses (
  id text primary key,
  date text not null,
  category text not null,
  description text not null,
  amount numeric not null default 0,
  created_at timestamptz default now()
);

-- Rentals
create table if not exists rentals (
  id text primary key,
  date text not null,
  channel text not null,
  description text not null,
  item_listing_price numeric not null default 0,
  rental_fee numeric not null default 0,
  created_at timestamptz default now()
);

-- Inventory
create table if not exists inventory (
  id text primary key,
  name text not null,
  code text,
  purchase_date text not null,
  purchase_price numeric not null default 0,
  listing_price numeric not null default 0,
  channel text not null,
  status text not null default 'Listed',
  sold_date text,
  sold_price numeric,
  created_at timestamptz default now()
);

-- Store plan (single row, id = 1)
create table if not exists store_plan (
  id integer primary key default 1,
  monthly_rent numeric not null default 5000,
  utilities numeric not null default 400,
  insurance numeric not null default 300,
  staff_cost numeric not null default 2500,
  pos_system numeric not null default 100,
  other_fixed numeric not null default 300,
  buildout_cost numeric not null default 20000,
  target_margin numeric not null default 65,
  savings_goal numeric not null default 30000,
  current_savings numeric not null default 0
);

-- Enable Row Level Security
alter table sales enable row level security;
alter table expenses enable row level security;
alter table rentals enable row level security;
alter table inventory enable row level security;
alter table store_plan enable row level security;

-- RLS Policies: authenticated users can do everything
create policy "Authenticated users can read sales" on sales for select to authenticated using (true);
create policy "Authenticated users can insert sales" on sales for insert to authenticated with check (true);
create policy "Authenticated users can delete sales" on sales for delete to authenticated using (true);

create policy "Authenticated users can read expenses" on expenses for select to authenticated using (true);
create policy "Authenticated users can insert expenses" on expenses for insert to authenticated with check (true);
create policy "Authenticated users can delete expenses" on expenses for delete to authenticated using (true);

create policy "Authenticated users can read rentals" on rentals for select to authenticated using (true);
create policy "Authenticated users can insert rentals" on rentals for insert to authenticated with check (true);
create policy "Authenticated users can delete rentals" on rentals for delete to authenticated using (true);

create policy "Authenticated users can read inventory" on inventory for select to authenticated using (true);
create policy "Authenticated users can insert inventory" on inventory for insert to authenticated with check (true);
create policy "Authenticated users can update inventory" on inventory for update to authenticated using (true);
create policy "Authenticated users can delete inventory" on inventory for delete to authenticated using (true);

create policy "Authenticated users can read store_plan" on store_plan for select to authenticated using (true);
create policy "Authenticated users can upsert store_plan" on store_plan for insert to authenticated with check (true);
create policy "Authenticated users can update store_plan" on store_plan for update to authenticated using (true);

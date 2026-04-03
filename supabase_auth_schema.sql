-- ============================================================
-- Run this in Supabase SQL Editor
-- Adds: volunteers table + admin_config table
-- ============================================================

-- Volunteers with PIN
create table if not exists volunteers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  pin        text not null,  -- store as plain 4-digit PIN (no sensitive data here)
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table volunteers enable row level security;
create policy "public read volunteers" on volunteers for select using (true);

-- Admin config (single row for shared password)
create table if not exists admin_config (
  id       integer primary key default 1,
  password text not null,
  check (id = 1)
);

alter table admin_config enable row level security;
create policy "public read admin_config" on admin_config for select using (true);

-- Insert default admin password: 'admin123' (change this!)
insert into admin_config (id, password) values (1, 'admin123')
on conflict (id) do nothing;

-- ── Sample volunteers (edit names + PINs as needed) ──────────
insert into volunteers (name, pin) values
  ('Rahul Sharma',   '1234'),
  ('Priya Patil',    '2345'),
  ('Amit Desai',     '3456'),
  ('Sneha Kulkarni', '4567'),
  ('Vijay Joshi',    '5678'),
  ('Pooja Mehta',    '6789'),
  ('Ravi Nair',      '7890'),
  ('Anjali Shah',    '8901')
on conflict do nothing;

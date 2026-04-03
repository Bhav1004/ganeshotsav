-- ============================================================
-- Ganeshotsav 2026 Donation Collection App — Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";


-- ─── buildings ───────────────────────────────────────────────
create table if not exists buildings (
  id   text primary key default gen_random_uuid()::text,
  name text not null
);

-- ─── wings ───────────────────────────────────────────────────
create table if not exists wings (
  id          text primary key default gen_random_uuid()::text,
  building_id text not null references buildings(id) on delete cascade,
  name        text not null
);

-- ─── flats ───────────────────────────────────────────────────
create table if not exists flats (
  id          text primary key default gen_random_uuid()::text,
  wing_id     text not null references wings(id) on delete cascade,
  floor       integer not null,
  flat_number text not null,
  status      text not null default 'pending' check (status in ('pending','paid'))
);

create index if not exists idx_flats_wing_id on flats(wing_id);
create index if not exists idx_flats_status  on flats(status);


-- ─── receipt_counter ─────────────────────────────────────────
-- Atomic, gap-free receipt numbering
create table if not exists receipt_counter (
  id      integer primary key default 1,
  current integer not null default 0,
  check (id = 1)           -- ensure only one row
);

insert into receipt_counter (id, current)
values (1, 0)
on conflict (id) do nothing;

-- RPC: atomically increment and return formatted receipt number
create or replace function next_receipt_number()
returns text language plpgsql security definer as $$
declare
  v_next integer;
begin
  update receipt_counter
  set    current = current + 1
  where  id = 1
  returning current into v_next;

  return 'GS2026-' || lpad(v_next::text, 5, '0');
end;
$$;


-- ─── donations ───────────────────────────────────────────────
create table if not exists donations (
  id             uuid primary key default gen_random_uuid(),
  flat_id        text not null references flats(id),
  donor_name     text not null,
  mobile         text,
  amount         numeric(10,2) not null check (amount > 0),
  payment_mode   text not null check (payment_mode in ('Cash','UPI')),
  transaction_id text,
  receipt_no     text not null unique,
  collected_by   text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_donations_flat_id    on donations(flat_id);
create index if not exists idx_donations_receipt_no on donations(receipt_no);
create index if not exists idx_donations_created_at on donations(created_at desc);


-- ─── Row Level Security ──────────────────────────────────────
-- Simple open policy (no auth required for volunteers)
-- Harden this if you add Supabase Auth later

alter table buildings      enable row level security;
alter table wings          enable row level security;
alter table flats          enable row level security;
alter table donations      enable row level security;
alter table receipt_counter enable row level security;

create policy "public read buildings"  on buildings      for select using (true);
create policy "public read wings"      on wings          for select using (true);
create policy "public read flats"      on flats          for select using (true);
create policy "public update flats"    on flats          for update using (true);
create policy "public insert donations" on donations     for insert with check (true);
create policy "public read donations"  on donations      for select using (true);
create policy "public exec counter"    on receipt_counter for all using (true);


-- ============================================================
-- SAMPLE DATA  (14 buildings, 3 wings each, 6 floors × 4 flats)
-- ============================================================

do $$
declare
  b_ids text[] := array[
    'b01','b02','b03','b04','b05','b06','b07',
    'b08','b09','b10','b11','b12','b13','b14'
  ];
  b_names text[] := array[
    'Anand Nagar A','Anand Nagar B','Shivaji Tower','Ganesh Heights',
    'Laxmi Residency','Saraswati Apts','Om Sai CHS','Rajhans Tower',
    'Sunrise CHS','Everest Apts','Green Park','Silver Oak',
    'Palm Grove','Royal Heights'
  ];
  wing_letters text[] := array['A','B','C'];
  bid   text;
  wid   text;
  bname text;
  wl    text;
  fl    integer;
  u     integer;
  fno   text;
  i     integer := 1;
  j     integer;
begin
  for i in 1..14 loop
    bid   := b_ids[i];
    bname := b_names[i];

    insert into buildings (id, name) values (bid, bname)
    on conflict (id) do nothing;

    for j in 1..3 loop
      wl  := wing_letters[j];
      wid := bid || '-w' || wl;

      insert into wings (id, building_id, name)
      values (wid, bid, 'Wing ' || wl)
      on conflict (id) do nothing;

      for fl in 1..6 loop
        for u in 1..4 loop
          fno := fl::text || '0' || u::text;
          insert into flats (id, wing_id, floor, flat_number, status)
          values (wid || '-' || fno, wid, fl, fno, 'pending')
          on conflict (id) do nothing;
        end loop;
      end loop;
    end loop;
  end loop;
end;
$$;

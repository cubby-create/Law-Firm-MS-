-- Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  firm_name text,
  email text,
  account_type text default 'trial',
  trial_expires_at timestamptz,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create firm data table
create table if not exists public.firm_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Enable row level security
alter table public.profiles enable row level security;
alter table public.firm_data enable row level security;

-- Profiles policies
create policy "Users can view own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

-- Firm data policies
create policy "Users can view own firm data"
on public.firm_data for select
using (auth.uid() = user_id);

create policy "Users can insert own firm data"
on public.firm_data for insert
with check (auth.uid() = user_id);

create policy "Users can update own firm data"
on public.firm_data for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own firm data"
on public.firm_data for delete
using (auth.uid() = user_id);

-- Storage bucket for user profile images and firm documents
create policy "Public profile images are viewable by everyone"
on storage.objects for select
using (bucket_id = 'profiles');

create policy "Authenticated users can upload profile images"
on storage.objects for insert
with check (bucket_id = 'profiles' and auth.role() = 'authenticated');

create policy "Authenticated users can update own profile images"
on storage.objects for update
using (bucket_id = 'profiles' and auth.role() = 'authenticated')
with check (bucket_id = 'profiles' and auth.role() = 'authenticated');

create policy "Authenticated users can delete own profile images"
on storage.objects for delete
using (bucket_id = 'profiles' and auth.role() = 'authenticated');

-- Create storage bucket
insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true)
on conflict (id) do nothing;

-- Optional helper function for profile updates
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

-- =============================================
-- Management system tables (per-firm, user-scoped).
-- Every row carries user_id and is protected by RLS,
-- so different firms' data never collides.
-- =============================================

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  id_number text,
  address text,
  company text,
  created_at timestamptz default now()
);

create table if not exists public.case_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_number text not null,
  practice_area text,
  client_id uuid references public.clients(id) on delete set null,
  title text,
  open_date date,
  close_date date,
  status text default 'Open',
  outcome text,
  court_case_number text,
  judge text,
  created_at timestamptz default now()
);

create table if not exists public.court_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid references public.case_files(id) on delete cascade,
  session_date date,
  time_in text,
  time_out text,
  hours numeric,
  court_name text,
  judge text,
  matter_type text,
  outcome text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date,
  currency text default 'KES',
  amount numeric not null default 0,
  source text,
  client_id uuid references public.clients(id) on delete set null,
  case_id uuid references public.case_files(id) on delete set null,
  reference text,
  is_credit boolean default false,
  invoice_id uuid,
  receipt_no text,
  created_at timestamptz default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date,
  category text,
  payee text,
  reason text,
  items text,
  amount numeric not null default 0,
  currency text default 'KES',
  is_debt boolean default false,
  paid_amount numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_number text,
  date date,
  client_id uuid references public.clients(id) on delete set null,
  case_id uuid references public.case_files(id) on delete set null,
  lines jsonb default '[]'::jsonb,
  total numeric default 0,
  status text default 'Unpaid',
  created_at timestamptz default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text,
  category text,
  amount numeric not null default 0,
  created_at timestamptz default now()
);

alter table public.clients enable row level security;
alter table public.case_files enable row level security;
alter table public.court_sessions enable row level security;
alter table public.income enable row level security;
alter table public.expenses enable row level security;
alter table public.invoices enable row level security;
alter table public.budgets enable row level security;

-- Row level security: each firm only ever sees its own rows
do $$
declare
  t text;
begin
  foreach t in array array['clients','case_files','court_sessions','income','expenses','invoices','budgets']
  loop
    execute format('drop policy if exists "own row select" on public.%I', t);
    execute format('drop policy if exists "own row insert" on public.%I', t);
    execute format('drop policy if exists "own row update" on public.%I', t);
    execute format('drop policy if exists "own row delete" on public.%I', t);
    execute format('create policy "own row select" on public.%I for select using (auth.uid() = user_id)', t);
    execute format('create policy "own row insert" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "own row update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('create policy "own row delete" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

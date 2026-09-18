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

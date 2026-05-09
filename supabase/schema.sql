-- kiran-os schema
-- Run this in your Supabase SQL editor to set up the database

-- Users (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Businesses
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type text not null, -- 'saas' | 'tool' | 'freelance' | 'other'
  status text not null default 'active', -- 'active' | 'planning' | 'paused'
  description text,
  monthly_revenue_target numeric default 0,
  current_mrr numeric default 0,
  created_at timestamptz default now()
);

-- Business metric logs (KPI history)
create table if not exists public.business_metric_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  metric_name text not null,
  value numeric not null,
  date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

-- Income sources (salary, bonds, business revenue)
create table if not exists public.income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type text not null, -- 'salary' | 'bonus' | 'business' | 'other'
  amount numeric not null,
  expected_date date,
  received boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- Savings / expense logs
create table if not exists public.savings_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null default current_date,
  amount numeric not null, -- positive = income/savings, negative = expense
  type text not null, -- 'income' | 'expense' | 'savings'
  category text,
  notes text,
  created_at timestamptz default now()
);

-- Goals
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  business_id uuid references public.businesses(id) on delete set null,
  title text not null,
  category text not null, -- 'financial' | 'fitness' | 'business' | 'personal'
  target_value numeric,
  current_value numeric default 0,
  unit text, -- '$', 'customers', 'kg', 'times/week'
  deadline date,
  status text not null default 'active', -- 'active' | 'achieved' | 'paused'
  notes text,
  created_at timestamptz default now()
);

-- Workout logs
create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null default current_date,
  type text not null, -- 'run' | 'calisthenics' | 'other'
  duration_mins integer,
  completed boolean default true,
  notes text,
  created_at timestamptz default now()
);

-- Daily check-ins
create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null default current_date,
  energy_level integer check (energy_level between 1 and 10),
  sleep_hours numeric,
  mood integer check (mood between 1 and 5),
  weight_kg numeric,
  notes text,
  created_at timestamptz default now(),
  unique (user_id, date)
);

-- Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  business_id uuid references public.businesses(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'medium', -- 'high' | 'medium' | 'low'
  due_date date,
  status text not null default 'todo', -- 'todo' | 'in_progress' | 'done'
  created_at timestamptz default now()
);

-- AI insights (cached daily briefings)
create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null default current_date,
  briefing_text text,
  top_actions jsonb default '[]',
  goal_analysis jsonb default '{}',
  created_at timestamptz default now(),
  unique (user_id, date)
);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_metric_logs enable row level security;
alter table public.income_sources enable row level security;
alter table public.savings_logs enable row level security;
alter table public.goals enable row level security;
alter table public.workout_logs enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.tasks enable row level security;
alter table public.ai_insights enable row level security;

-- Each user can only see their own data
create policy "own data" on public.profiles for all using (auth.uid() = id);
create policy "own data" on public.businesses for all using (auth.uid() = user_id);
create policy "own data" on public.business_metric_logs for all using (
  business_id in (select id from public.businesses where user_id = auth.uid())
);
create policy "own data" on public.income_sources for all using (auth.uid() = user_id);
create policy "own data" on public.savings_logs for all using (auth.uid() = user_id);
create policy "own data" on public.goals for all using (auth.uid() = user_id);
create policy "own data" on public.workout_logs for all using (auth.uid() = user_id);
create policy "own data" on public.daily_checkins for all using (auth.uid() = user_id);
create policy "own data" on public.tasks for all using (auth.uid() = user_id);
create policy "own data" on public.ai_insights for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

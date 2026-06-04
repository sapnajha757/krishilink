-- KrishiLink — run in Supabase SQL Editor (new project or migrate existing)
-- Dashboard: https://supabase.com/dashboard → your project → SQL → New query

-- Extensions
create extension if not exists "uuid-ossp";

-- =============================================================================
-- PROFILES (extends auth.users)
-- =============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text check (role in ('consumer', 'farmer', 'admin')) default 'consumer',
  phone text default '',
  location text default '',
  avatar_url text,
  is_flagged boolean default false,
  is_suspended boolean default false,
  created_at timestamptz default now()
);

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists is_flagged boolean default false;
alter table public.profiles add column if not exists is_suspended boolean default false;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'consumer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- PRODUCTS
-- =============================================================================
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text default '',
  price_per_kg numeric not null check (price_per_kg >= 0),
  quantity_kg numeric not null check (quantity_kg >= 0),
  category text not null default 'Vegetables',
  location text not null default '',
  is_available boolean default true,
  created_at timestamptz default now()
);

-- =============================================================================
-- ORDERS
-- =============================================================================
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  consumer_id uuid not null references public.profiles(id) on delete cascade,
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity_kg numeric not null check (quantity_kg > 0),
  total_price numeric not null check (total_price >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'delivered', 'cancelled')),
  created_at timestamptz default now()
);

-- =============================================================================
-- MESSAGES (chat)
-- =============================================================================
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- =============================================================================
-- PAYMENTS (server / Razorpay — service role writes)
-- =============================================================================
create table if not exists public.payments (
  order_id text primary key,
  checkout_status text,
  amount numeric,
  currency text default 'INR',
  consumer_id uuid,
  payment_id text,
  verified boolean,
  method text,
  items jsonb,
  webhook_received_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists public.payment_webhook_events (
  id bigserial primary key,
  event_id text unique,
  event_type text,
  payload jsonb,
  created_at timestamptz default now()
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.messages enable row level security;
alter table public.payments enable row level security;
alter table public.payment_webhook_events enable row level security;

-- Profiles: read all (marketplace farmer names), update own
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id);

-- Products: public read available; farmers manage own
drop policy if exists "Anyone can view available products" on public.products;
create policy "Anyone can view available products"
  on public.products for select using (is_available = true or farmer_id = auth.uid());

drop policy if exists "Farmers can insert own products" on public.products;
create policy "Farmers can insert own products"
  on public.products for insert to authenticated
  with check (farmer_id = auth.uid());

drop policy if exists "Farmers can update own products" on public.products;
create policy "Farmers can update own products"
  on public.products for update to authenticated
  using (farmer_id = auth.uid());

drop policy if exists "Farmers can delete own products" on public.products;
create policy "Farmers can delete own products"
  on public.products for delete to authenticated
  using (farmer_id = auth.uid());

-- Orders: consumers see own orders; farmers see orders for their products
drop policy if exists "Consumers can view own orders" on public.orders;
create policy "Consumers can view own orders"
  on public.orders for select to authenticated
  using (consumer_id = auth.uid() or farmer_id = auth.uid());

drop policy if exists "Consumers can place orders" on public.orders;
create policy "Consumers can place orders"
  on public.orders for insert to authenticated
  with check (consumer_id = auth.uid());

drop policy if exists "Farmers can update order status" on public.orders;
create policy "Farmers can update order status"
  on public.orders for update to authenticated
  using (farmer_id = auth.uid());

-- Messages: participants only
drop policy if exists "Users can view own messages" on public.messages;
create policy "Users can view own messages"
  on public.messages for select to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "Users can send messages" on public.messages;
create policy "Users can send messages"
  on public.messages for insert to authenticated
  with check (sender_id = auth.uid());

drop policy if exists "Users can mark messages read" on public.messages;
create policy "Users can mark messages read"
  on public.messages for update to authenticated
  using (receiver_id = auth.uid());

-- Payments: no client access (API uses service role)
drop policy if exists "No public payments access" on public.payments;
create policy "No public payments access"
  on public.payments for all using (false);

drop policy if exists "No public webhook access" on public.payment_webhook_events;
create policy "No public webhook access"
  on public.payment_webhook_events for all using (false);

-- =============================================================================
-- STORAGE: avatars bucket (run after creating bucket "avatars" in Dashboard,
-- or uncomment insert below if bucket API is enabled)
-- =============================================================================
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
-- on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

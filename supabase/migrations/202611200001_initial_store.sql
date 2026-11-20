create extension if not exists pgcrypto;
create sequence if not exists public.krp_order_number_seq;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  description text not null default '',
  image_url text not null,
  pack_label text not null default '250 g',
  price integer check (price is null or price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  phone text not null,
  email text,
  delivery_address text not null,
  note text,
  status text not null default 'pending' check (status in ('pending','confirmed','packed','dispatched','delivered','cancelled')),
  payment_status text not null default 'not_started' check (payment_status in ('not_started','pending','paid','refunded')),
  payment_method text,
  total integer,
  stock_committed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  pack_label text not null,
  unit_price integer,
  quantity integer not null check (quantity between 1 and 20),
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);

create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists reviews_product_id_idx on public.reviews(product_id);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;

revoke all on public.products, public.orders, public.order_items, public.reviews from anon, authenticated;
grant all on public.products, public.orders, public.order_items, public.reviews to service_role;
grant usage, select on sequence public.krp_order_number_seq to service_role;
grant select on public.products to anon, authenticated;
grant select (product_id, rating, created_at) on public.reviews to anon, authenticated;

create policy "Public can read listed products" on public.products
  for select to anon, authenticated using (is_active = true);
create policy "Public can read review summaries" on public.reviews
  for select to anon, authenticated using (true);

create or replace function public.place_order(
  p_customer_name text,
  p_phone text,
  p_email text,
  p_delivery_address text,
  p_note text,
  p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_order_number text := 'KRP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.krp_order_number_seq')::text, 5, '0');
  v_item jsonb;
  v_product public.products%rowtype;
  v_quantity integer;
  v_has_request_price boolean := false;
  v_total integer := 0;
begin
  if length(trim(p_customer_name)) < 2 or length(regexp_replace(p_phone, '\D', '', 'g')) < 8 or length(trim(p_delivery_address)) < 8 then
    raise exception 'Invalid customer details';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then
    raise exception 'Invalid item list';
  end if;
  insert into public.orders (id, order_number, customer_name, phone, email, delivery_address, note)
  values (v_order_id, v_order_number, left(trim(p_customer_name), 100), right(regexp_replace(p_phone, '\D', '', 'g'), 15), nullif(left(trim(coalesce(p_email, '')), 160), ''), left(trim(p_delivery_address), 1000), nullif(left(trim(coalesce(p_note, '')), 500), ''));
  for v_item in select value from jsonb_array_elements(p_items) loop
    if (v_item->>'quantity') !~ '^([1-9]|1[0-9]|20)$' then raise exception 'Invalid quantity'; end if;
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_product from public.products where id::text = v_item->>'product_id' and is_active = true for share;
    if not found or v_product.stock_quantity < v_quantity then raise exception 'Product unavailable or insufficient stock'; end if;
    insert into public.order_items (order_id, product_id, product_name, pack_label, unit_price, quantity)
    values (v_order_id, v_product.id, v_product.name, v_product.pack_label, v_product.price, v_quantity);
    if v_product.price is null then v_has_request_price := true; else v_total := v_total + v_product.price * v_quantity; end if;
  end loop;
  update public.orders set total = case when v_has_request_price then null else v_total end where id = v_order_id;
  return jsonb_build_object('id', v_order_id, 'order_number', v_order_number);
end;
$$;

create or replace function public.manage_confirmed_order_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
begin
  if old.status <> 'confirmed' and new.status = 'confirmed' and not old.stock_committed then
    for v_item in select product_id, quantity from public.order_items where order_id = new.id and product_id is not null loop
      update public.products set stock_quantity = stock_quantity - v_item.quantity, updated_at = now()
      where id = v_item.product_id and stock_quantity >= v_item.quantity;
      if not found then raise exception 'Insufficient stock to confirm order'; end if;
    end loop;
    new.stock_committed := true;
  elsif old.status <> 'cancelled' and new.status = 'cancelled' and old.stock_committed then
    for v_item in select product_id, quantity from public.order_items where order_id = new.id and product_id is not null loop
      update public.products set stock_quantity = stock_quantity + v_item.quantity, updated_at = now() where id = v_item.product_id;
    end loop;
    new.stock_committed := false;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists orders_manage_stock on public.orders;
create trigger orders_manage_stock before update of status on public.orders
for each row execute function public.manage_confirmed_order_stock();

revoke all on function public.place_order(text,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.place_order(text,text,text,text,text,jsonb) to service_role;
revoke all on function public.manage_confirmed_order_stock() from public, anon, authenticated;

insert into public.products (slug, name, category, description, image_url, pack_label, price, stock_quantity)
values
  ('dried-figs', 'Dried Figs (Anjeer)', 'Figs', 'Soft, naturally sweet figs for your everyday table.', '/assets/dried-figs.png', '250 g', null, 18),
  ('walnut-kernels', 'Walnut Kernels (Akhrot)', 'Walnuts', 'Selected walnut kernels, ready for a little crunch.', '/assets/walnut-kernels.png', '250 g', null, 12),
  ('almonds-selection-one', 'Almonds — Selection 1', 'Almonds', 'Our first almond selection. Ask about the variety and pack sizes.', '/assets/almonds-selection-1.png', '250 g', null, 20),
  ('almonds-selection-two', 'Almonds — Selection 2', 'Almonds', 'Our second almond selection. Ask about the variety and pack sizes.', '/assets/almonds-selection-2.png', '250 g', null, 16),
  ('golden-raisins', 'Golden Raisins (Kishmish)', 'Raisins', 'Golden raisins, lovely by the handful or in a recipe.', '/assets/golden-raisins.png', '250 g', null, 25)
on conflict (slug) do nothing;

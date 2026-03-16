-- AccountBook Database Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/xzkklxmhqocjfyfsfzub/sql

create extension if not exists "uuid-ossp";

create table companies (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  currency text default 'USD',
  tax_id text,
  created_at timestamptz default now()
);

create table accounts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  code text not null,
  name text not null,
  type text not null check (type in ('asset','liability','equity','revenue','expense')),
  parent_id uuid references accounts(id),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table transactions (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  date date not null,
  description text not null,
  reference text,
  currency text default 'USD',
  exchange_rate numeric default 1,
  created_at timestamptz default now()
);

create table transaction_lines (
  id uuid primary key default uuid_generate_v4(),
  transaction_id uuid references transactions(id) on delete cascade,
  account_id uuid references accounts(id),
  debit numeric(15,2) default 0,
  credit numeric(15,2) default 0,
  description text
);

create table invoices (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  invoice_number text not null,
  client_name text not null,
  client_email text,
  issue_date date not null,
  due_date date not null,
  status text default 'draft' check (status in ('draft','sent','paid','overdue','cancelled')),
  currency text default 'USD',
  tax_rate numeric(5,2) default 0,
  notes text,
  created_at timestamptz default now()
);

create table invoice_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid references invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null,
  unit_price numeric(15,2) not null
);

create table bank_accounts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  account_id uuid references accounts(id),
  name text not null,
  bank_name text,
  account_number text,
  currency text default 'USD',
  created_at timestamptz default now()
);

create table bank_transactions (
  id uuid primary key default uuid_generate_v4(),
  bank_account_id uuid references bank_accounts(id) on delete cascade,
  date date not null,
  description text,
  amount numeric(15,2) not null,
  is_reconciled boolean default false,
  transaction_line_id uuid references transaction_lines(id),
  created_at timestamptz default now()
);

-- Row Level Security
alter table companies enable row level security;
alter table accounts enable row level security;
alter table transactions enable row level security;
alter table transaction_lines enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table bank_accounts enable row level security;
alter table bank_transactions enable row level security;

-- Policies (users only see their own data)
create policy "Users see own company" on companies for all using (auth.uid() = user_id);
create policy "Users see own accounts" on accounts for all using (company_id in (select id from companies where user_id = auth.uid()));
create policy "Users see own transactions" on transactions for all using (company_id in (select id from companies where user_id = auth.uid()));
create policy "Users see own invoices" on invoices for all using (company_id in (select id from companies where user_id = auth.uid()));
create policy "Users see own bank accounts" on bank_accounts for all using (company_id in (select id from companies where user_id = auth.uid()));

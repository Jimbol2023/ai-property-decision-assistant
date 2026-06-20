create table if not exists properties (
  id bigserial primary key,
  address text not null,
  normalized_address text not null,
  property_type text not null,
  purchase_price numeric(14, 2) not null,
  estimated_value numeric(14, 2) not null,
  down_payment numeric(14, 2) not null,
  interest_rate numeric(6, 3) not null,
  loan_term_years integer not null,
  monthly_rent numeric(14, 2) not null,
  monthly_expenses numeric(14, 2) not null,
  repair_cost numeric(14, 2) not null,
  vacancy_rate numeric(6, 3) not null,
  neighborhood_score numeric(6, 3) not null,
  risk_tolerance text,
  goal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists properties_normalized_address_property_type_idx
  on properties (normalized_address, property_type);

create table if not exists analysis_history (
  id bigserial primary key,
  property_id bigint not null references properties(id) on delete cascade,
  input_snapshot jsonb not null,
  metrics jsonb not null,
  risks jsonb not null,
  next_steps jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists analysis_history_property_id_created_at_idx
  on analysis_history (property_id, created_at desc);

create table if not exists recommendations (
  id bigserial primary key,
  analysis_id bigint not null unique references analysis_history(id) on delete cascade,
  recommendation text not null,
  score integer not null,
  summary text not null,
  ai_note text,
  created_at timestamptz not null default now()
);

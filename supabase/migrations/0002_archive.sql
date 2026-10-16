-- Archive flag per match. Archived offers render greyed at the bottom.
alter table public.matches add column if not exists archived boolean not null default false;

-- "Liberar mais cedo": the guest left before checkout time, so the cleaning
-- can start now. The cleaner sees it on their list.
alter table public.cleanings add column released_at timestamptz;

-- Departure time the guest announced in the Hospitable chat ("saímos às 9h").
-- Once that time passes on the cleaning day, the cleaning counts as released.
alter table public.cleanings
  add column guest_departure_time time,
  add column departure_read_at timestamptz;

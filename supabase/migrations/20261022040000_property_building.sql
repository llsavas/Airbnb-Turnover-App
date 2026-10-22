-- Groups apartments by building (e.g. "Skyline", "Connect"), so lists and
-- assignments can be organised building by building.
alter table public.properties add column building text;

create index properties_building_idx on public.properties (building);

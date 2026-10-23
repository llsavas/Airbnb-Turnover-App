export const NO_BUILDING = "Sem prédio";

// Splits items into buildings (alphabetical, "Sem prédio" last), keeping the
// order of the items inside each building.
export function groupByBuilding<T>(
  items: T[],
  buildingOf: (item: T) => string | null | undefined,
): { building: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const building = buildingOf(item) || NO_BUILDING;
    groups.set(building, [...(groups.get(building) ?? []), item]);
  }
  return [...groups.entries()]
    .map(([building, groupItems]) => ({ building, items: groupItems }))
    .sort((a, b) =>
      a.building === NO_BUILDING ? 1 : b.building === NO_BUILDING ? -1 : a.building.localeCompare(b.building, "pt-BR"),
    );
}

export function buildingNames(properties: { building: string | null }[]): string[] {
  return [...new Set(properties.map((p) => p.building).filter((b): b is string => !!b))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}

// "Skyline · Apto 406" from a name like "406 Marcel - Skyline - Cam".
export function aptLabel(property: { name: string; building: string | null } | null | undefined): string {
  if (!property) return "Imóvel removido";
  const number = property.name.match(/^\d+/)?.[0];
  if (!number || !property.building) return property.name;
  return `${property.building} · Apto ${number}`;
}

// Empty selection means every building.
export function inBuildings(selected: string[], building: string | null | undefined): boolean {
  return selected.length === 0 || selected.includes(building || NO_BUILDING);
}

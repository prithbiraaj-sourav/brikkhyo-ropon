// Validated 8-hue categorical palette, fixed order (blue, aqua, yellow,
// green, violet, red, magenta, orange). Order is the CVD-safety mechanism —
// never reorder or cycle it. Validated with:
//   node scripts/validate_palette.js "<hexes>" --mode light --pairs all
// (all-pairs check since any two circles can sit side by side on the map).
export const CATEGORICAL_PALETTE = [
  '#2a78d6', // blue
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
  '#e87ba4', // magenta
  '#eb6834', // orange
]

// A 9th+ organization never gets a generated hue — it folds into this
// neutral "Other" gray instead (matches the muted/axis ink role).
export const OTHER_ORG_COLOR = '#898781'

export type OrgColorEntry = { name: string; color: string }

// Assigns colors in a fixed order (organization creation order) so a color
// never shifts when an org is renamed or when the current view happens to
// filter out other organizations — color follows the entity, not its rank.
export function buildOrgColorEntries(orgNamesInCreationOrder: string[]): OrgColorEntry[] {
  return orgNamesInCreationOrder.map((name, i) => ({
    name,
    color: i < CATEGORICAL_PALETTE.length ? CATEGORICAL_PALETTE[i] : OTHER_ORG_COLOR,
  }))
}

export function buildOrgColorMap(orgNamesInCreationOrder: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const entry of buildOrgColorEntries(orgNamesInCreationOrder)) map[entry.name] = entry.color
  return map
}

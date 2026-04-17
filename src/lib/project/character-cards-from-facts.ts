import type { PlotFact } from "@/lib/plot-index/story-extraction";
import type { CharacterProfile } from "@/lib/project/types";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Entity names from plot facts that have no matching character card (by display name or alias). */
export function listEntityNamesMissingCards(
  facts: PlotFact[],
  profiles: CharacterProfile[],
): string[] {
  const covered = new Set<string>();
  for (const p of profiles) {
    covered.add(norm(p.displayName));
    for (const a of p.aliases) covered.add(norm(a));
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of facts) {
    if (f.entityType !== "character") continue;
    if (f.entityConfidence < 0.65) continue;
    const name = f.entity.trim();
    if (!name) continue;
    const key = norm(name);
    if (covered.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.sort((a, b) => a.localeCompare(b, "ru"));
}

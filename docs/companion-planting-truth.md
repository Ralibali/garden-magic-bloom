# Companion planting / content truth

Flagged 2026-09-02 during the Garden OS audit. Nothing in `COMPANION_DATA` cites a trial, paper, or Swedish extension source. Do not treat these pairs as pest-control facts.

## Claims that state pest protection as fact

| Location | Claim | Problem |
|---|---|---|
| `src/pages/CompanionPlanting.tsx` hero | Was: “Rätt grannar håller skadedjur borta och hjälper varandra att växa.” | States pest protection as fact. Qualifier added in the Pulse PR: “sägs enligt odlartradition… inte mot fältförsök.” |
| Same page kicker | “Naturens egen skyddsverkstad” | Folklore framing. Left in place (tone, not a testable claim). |
| `src/lib/weatherTips.ts` `COMPANION_DATA` | Tomato+basil good, onion+carrot good, etc. | Unsourced pair table. Used as if it were a knowledge graph. |
| `src/lib/companionAnalysis.ts` | Matches free-text `sowings.variety` against that table and labels beds “bra grannar” / “undvik ihop”. | Repeats folklore onto the user’s actual beds. |
| `seo_plants.companion_plants` / `avoid_plants` | Public plant pages can republish the same pairs. | Same evidence gap, SEO-amplified. |

## What is already honest (leave it)

- Gro’s system prompt: “Du får aldrig hitta på fakta” and must label **trolig / möjlig / osäker**.
- Crop rotation family warnings (`CropRotation.tsx`) are a different claim (same family, same bed, consecutive years). That is established practice, not companion-planting folklore.
- Winter-task copy about rotation and clubroot is closer to agronomy than “basil keeps flies off tomatoes.”

## Do not silently delete

The pair table is a feature users can browse. Deleting it in this PR would look like a product regression. Next honest step, if anyone touches this surface:

1. Rename UI from “skyddsverkstad” to “odlartradition”.
2. Add `source: 'folklore'` on each pair, or drop pairs with no source.
3. Stop auto-warning beds until a pair has a cited source.

No second content rewrite in this PR beyond the one-line qualifier.

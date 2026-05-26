# Stage 5b — Open questions / deviations for user review

## 1. Item-grid 1→2-col threshold: dropped from 340px → 300px

**Spec said:** Lower from 415 → 340px (design.md D9).

**Shipped:** 300px.

**Why:** The D9 math assumed only the `.container--items-library` mobile padding (20px ea. side). It missed the `.app-surface-bleed` mobile padding (12px ea. side from `app-frame.css:238`). At a 375px iPhone-SE viewport the inner `.item-grid-container` measures **311px** — below 340 — so 2-col would not engage on the smallest target. 300px lets every iPhone-class device flip to 2-col (311→2-col @ 375; 329→2-col @ 393).

**Trade-off:** Smallest 2-col cell is ~148px wide (was ~170px at 340 threshold). Verified visually that the Item card primitive (4:3 image + name + price + store-label pills) still renders cleanly at that width. If you'd rather restore the 340 number and instead **reduce `.container--items-library` side padding on mobile** from 20px to ~12px, that would also work — a single CSS change in [item.css:306-309](<app/(main)/items/ui/styles/item.css:306>). Let me know which you prefer.

## 2. Choose-items toolbar composition (5b.6) only spot-verified

Stage 5 is being rewritten in a parallel session — markup for `/lists/[id]/choose-items` may change. I confirmed the `ItemsToolbar` primitive itself works at 393px on that route (the Filters trigger renders), but the end-to-end composition with the change-tracking banner + sticky footer (which aren't in the codebase yet on `dev` — they're part of Stage 5's in-flight work) was not verified. The other session should re-verify after Stage 5 lands.

## 3. Mobile filter-sheet anchor: bottom sheet, not inline expand

Spec gave the implementer the choice. I picked bottom sheet (`position: fixed; bottom: 0`) because it composes cleanly with the constrained-height flex-column from 4.5b — the inline-expand option would have either pushed the grid down (changing its `flex: 1` size mid-interaction) or required overlaying the toolbar which felt cramped at 375px. Easy to swap if you'd prefer the inline panel.

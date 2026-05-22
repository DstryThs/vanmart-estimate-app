# Van Mart Estimate App

Customer-facing estimate builder for Van Mart Service. Mike (Service Manager) builds estimates manually using this tool and sends the output link to customers.

## What This App Does

Generates branded, visual estimates for Sprinter van upfitting jobs. The customer receives a professional-looking estimate they can review -- not a flat invoice.

## ICP Context

**Customer:** Premium Sprinter owners within 50 miles of Orange County who want high-quality, installed upgrades without managing parts, fitment, or installation themselves.

- Not price shoppers
- Want expertise and zero friction
- Trust the shop to know what their van needs
- The estimate is a trust signal -- premium design matters
- Avg ticket target: $3,500+ (currently ~$2,300 with no upsell happening)

## Current State

- App is built and functional
- Mike builds estimates manually per job
- Not yet used with real customers -- blocked on two issues (see Active Workstreams below)
- No upsell section exists yet

## Active Workstreams

### 1. URL Fix (do first)
The current URL contains Mike's personal GitHub repo name -- not appropriate for customer-facing use. Fix: deploy to Netlify with a clean custom domain.

Target URL: `estimates.thevanmart.com` or `service.thevanmart.com` (confirm with Mike).

Steps:
- Connect repo to Netlify
- Configure custom domain
- Verify estimate renders correctly at new URL
- Update any hardcoded references to the old URL

### 2. Upsell Section -- "Recommended for your van"

Every estimate needs a recommendation section below the primary job items. This is the #1 revenue lever -- no upsell conversation is happening currently.

**Builder side (Mike's interface):**
- After primary job selection, surface relevant add-on suggestions mapped to that job type
- Mike selects which to include, can edit the rationale, or skip
- Pre-written rationale per add-on that Mike can adjust

**Output side (customer-facing):**
- Section heading: "Recommended for your van"
- Each item: name + 1-2 sentence rationale + price
- Visually distinct from primary quote -- callout style, not a plain line item
- Summary shows: "Your requested items: $X | With recommendations: $Y"
- Tone: helpful and expert, not salesy

**Rationale framing examples:**
- *"Since we're already routing wiring for the side steps, adding the center console now reduces the labor overlap -- it costs less than scheduling it separately."*
- *"Most Sprinter owners who install side steps add the cup holder tray in the same visit -- it's a clean pairing and the install is straightforward while we're already in."*

**Job-to-recommendation mapping (starting set -- Mike to validate and expand):**

| Primary job | Suggested add-ons |
|---|---|
| Side steps | Center console, cup holder tray, footrest storage |
| Capsule | Footrest storage, cup holder tray, center console |
| Windows | Window shades/covers, ventilation fan |
| Electrical | Battery monitor, USB charging panel, lighting |
| Racks | Tie-down system, ladder, lighting bar |

**What success looks like:**
- Mike can send a customer estimate via a clean professional URL
- Every estimate session prompts Mike to consider relevant add-ons
- Customer sees primary job + recommendations + two totals
- Adds ~5 min to Mike's workflow, not more

## Design Principles

- Output should look premium -- customers spending $2,300-$6,000+
- Recommendation section feels like expert advice, not a sales tactic
- Warm and direct copy -- no corporate upsell language
- Reference `references/examples/llm-generated-illustrative-estimate-example.PNG` in the AIOS repo for aesthetic target

## Pricing Reference

Pricing CSV lives in the AIOS repo at `references/install-pricing-2025.csv`. Pull from there for accurate part and labor costs.

## Broader Strategy Context

Full sales growth strategy lives in the AIOS repo (`dstryths/oscar`) at:
`projects/sales-growth/strategy.md`

The estimate upsell section is Track 1 of a two-track plan to reach $75K/month. The estimate is the primary sales touchpoint -- getting this right is the fastest path to increasing avg ticket size.

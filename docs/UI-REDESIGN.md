# Editorial UI redesign

Updated 4 October 2026. Local preview: http://localhost:3000.

## Design

The supplied charity-site reference informed the white/cream surfaces, forest-green utility bar, mustard pill actions, strong headings, restrained card borders and photographic sections. The opening is a light split hero to respect the requested light background. Shared page headers, buttons and card presentation carry this language across the public site. Explicit dark-mode choice remains available; new visitors default to light.

Existing navigation, member forms, filters, links, records and services remain in place. Decorative 3D hero/globe, cursor, noise and magnetic movement were removed from the redesigned presentation. Descriptions of those former visual effects were updated to describe the current design. The AI assistant remains available, with its unsolicited teaser hidden on phones so it cannot cover primary actions.

## Content safeguards

- Original source copy: `backups/ui-before-redesign/`.
- All ten `lib/data` files match the backup byte for byte.
- Fifteen rendered public pages compared with `reports/ui-content-baseline.json`; the only removed long text fragments describe replaced decorative effects on the homepage. See `reports/ui-content-comparison.json`.
- No database reset or reseed was performed for this redesign.
- Existing programme imagery was reused; no new institutional endorsements or claims were added.

## Validation

- Production build, TypeScript validation and Next.js lint passed.
- 46 route smoke checks passed.
- 63 responsive source/rendered checks passed. The hero typography assertion now checks the actual editorial heading and its fluid `clamp()` sizing.
- 12 health checks passed. Email/payment integration credentials remain an existing configuration requirement.
- 49 existing colour pairs passed the palette check. The tsx launcher hit a Windows `userInfo` error, so the same TypeScript check was run using TypeScript's transpiler directly.
- Nine new editorial colour pairs meet 4.5:1 text contrast; report: `reports/ui-editorial-contrast.json`.
- Desktop and phone layouts, mobile menu navigation and public programme/conference pages were visually inspected. These checks do not constitute full end-to-end payment or email validation.

## Stack

Next.js 14 App Router, React 18, TypeScript, Tailwind CSS 3, Lucide icons, Framer Motion, and Prisma 5 with the existing local SQLite database. Backend routes and authentication remain in the same Next.js project.

## Social links follow-up
Removed the fixed social rail from the shared site shell after it overlapped homepage content at desktop widths. Existing footer social, email and WhatsApp links are preserved; the homepage feature description now points to the footer.

## Header follow-up
Removed the green utility strip. The shared navbar is now 96px tall on desktop and 88px on mobile, with a 64px header emblem and aligned mobile-menu spacing. Footer contact details remain available.

## Information cards and punctuation follow-up

Icon information cards now use the supplied reference: white surfaces, green square icon tiles, fine green borders on opposing corners, restrained shadows and readable spacing. This treatment covers the thematic pillars, governance cards, courses, research services and other icon information grids.

Displayed copy is normalised through `lib/display-content.ts`, including database-backed text and conditional rendering. Static JSX text was updated too. En and em dash number ranges use “to”; compound words use spaces; sentence separators use commas. The display layer preserves stored data, route slugs, CSS classes, URLs, form values and structured data.

Certificate verification accepts the displayed space-separated code as well as the original code format, while retaining canonical stored identifiers. Public page text is checked by `reports/audit-display-dashes.cjs` and its JSON report.

Validation for this follow-up: production build passed; 43 public pages scanned with zero displayed dash characters; homepage browser text also had zero matches after hydration; 63 responsive checks and 18 authorisation checks passed. Certificate lookup succeeded for canonical, space-separated and compact codes. Desktop and 390px mobile card layouts were visually checked without horizontal overflow.

## Open photography update
Replaced the six repeated legacy photographs with 26 distinct Wikimedia Commons photographs. The active library is public/images/editorial and the attribution registry is lib/site-photos.ts. Each image is at least 1280 pixels wide, stored locally as WebP, and has a unique SHA256 hash. Original photos are archived in backups/retired-photos.

Photo credits at /photo-credits provide original sources, photographers, licences and adaptation notes. Images illustrate topics and places and do not claim to document PYPC events. Official emblems and functional graphics remain in place.

Validation: production build including lint and types passed; all 46 route checks passed; all 26 local image responses and Next image optimisation returned HTTP 200; 44 public pages passed the no dash content audit. Desktop homepage and programme cards reviewed visually. Mobile conferences and credits checked at 390 pixels with no horizontal overflow. Credits contain all 26 entries.

## Pakistan photo and distraction cleanup
Removed the AI assistant teaser markup, state and timer while retaining the chat launcher and conversation panel. Removed the site wide ScrollProgress mount, which was the thin filling line above the navbar.

Replaced five marked foreign context images with individually verified Commons photographs: youth activists at Lahore Fort, tree planting at Hanna Lake, Pakistani student dialogue in Islamabad, Earth Day planting in Pakistan and the computer lab at GHS Wagh in Jhelum. The Saidpur photograph was already verified as Islamabad and retained. Updated source attribution and alt text; archived replaced assets. All 26 current photographs remain distinct.

## Circular hero and future targets
Added a circular hero carousel with four verified Pakistan photographs, thumbnail selectors, previous and next controls, and a pause button. Automatic advance pauses on hover or keyboard focus and is disabled for reduced motion. Image transitions use a short rotation and fade while the copy and primary links remain stable.

The user confirmed 100,000 members and 10+ certificates are future targets. Both homepage statistic groups now label these explicitly as targets. Programme, event and opportunity figures still use the database; programme count is correctly labelled active programmes rather than delivered programmes. No database counts were altered.
Validation: production build including lint and types passed. Desktop at 1440 pixels and mobile at 390 pixels showed no horizontal overflow. Thumbnail and next controls selected the expected photograph and caption. Pause control toggled correctly. The 44 page visible content audit passed with no dashes.

## User supplied hero photograph
The second circular hero slide now uses the photograph supplied by the user. It is displayed with contain sizing to keep all six people visible. Removed the visible previous, next, counter and pause control bar. Automatic six second transitions and thumbnail selection remain. A keyboard accessible pause control appears only when focused; hover, focus and reduced motion handling remain intact. The supplied photo is not labelled as open licence photography.

## Updated targets and tab icon
Updated both homepage metric groups to 5,000 members, 25 programmes, 70+ certificates and 100+ events, explicitly labelled future targets. Database counts are unchanged. The browser favicon is now an SVG white rounded tile containing the unchanged PYPC emblem, with light padding for legibility. The former transparent app icon is archived under backups/tab-icon.

## Caption spacing and supplied introduction photographs
Moved the circular hero caption into document flow below a separate image stage so the image cannot cover the eyebrow or heading at different screen widths. Replaced both introduction collage images with the user's supplied group and office conversation photos. Landscape frames preserve the full groups and both speakers.

Removed pakistan-youth-lahore and pakistan-planting-hanna from all active source references, the photo attribution registry and public assets. Their backups are outside the served public directory. Supplied photographs are not presented as open licence stock images.

## Homepage spacing refinement
Balanced the research and regional reach columns by stretching the regions panel to the research column height and distributing its region cards evenly. Removed the featured carousel's visible previous, next and pause buttons; automatic cycling and keyboard accessible pause remain. Reduced the circular hero image stage and caption margin to keep a compact clear gap without overlap.

## Restored collage and verification card
Restored the original arched main photograph and overlapping secondary photograph, retaining the user's two supplied images. Removed the hero status strip as requested. Redesigned the certificate verification card with left aligned copy, a high contrast white eyebrow badge, and a fully contained emblem in a separate white circular frame instead of a clipped corner watermark.

## Homepage card refinements
Research heading now precedes both aligned columns, with Pakistan flags on the service cards and geographic icons in the region cards. Membership emblem uses a larger white backing. Institutional engagement cards use six distinct existing Commons photographs with readable overlays, original statuses, descriptions and links, and illustrative labels. Credits remain in the photo registry. Introduction restored to landscape rectangles, using lossless encodes of supplied originals and higher quality responsive image delivery to avoid the previous heavy crop.


## Clear institution photos and consolidated footer
Added the user supplied NDU photograph. Removed all full image dark overlays from engagement cards and placed descriptions on white panels below clear photos. Removed the repeated homepage directory and closing band, consolidated all destinations into four footer navigation groups with social links, contact details, office hours, trust details and live status. Footer now uses the light cream palette and a single join call to action.


## Corrected visual scope
Restored green footer while retaining its reorganized navigation. Restored full photo institution cards with a light localized gradient and a translucent glass text panel. Card images now load directly from their local WebP files to avoid the optimizer dependency. Removed visible Illustrative photo badges from all four shared card/carousel components. Credits remain available.


## Restore black gradient cards
At user request, institution cards again use a full black gradient with text directly over the photo; removed the inset glass panel. Removed the entire footer certification, audit, pillars and payment methods strip. Retained all photos, statuses, record links and green footer layout.


## Aligned technical highlights and icon cleanup
Both technical highlight groups share desktop grid rows so all four cards per row start and end together. Removed tilt from these cards. Replaced the sparkle icon with contextual palette, assistant, membership and activation icons across the site, and removed it from the shared registry and fallback.


# Mission metrics

Rainbow Butterflies measures a small set of mission-funnel signals without installing a third-party analytics product or creating a durable visitor identifier.

## Browser behavior

The client emits only:

- one `visit` or `return_visit` event per browser per UTC day;
- a `fundraiser_click` when a visitor follows the configured Against Malaria fundraiser link.

The browser stores:

- `rb_seen=1`, a boolean indicating that this browser has visited before;
- `rb_visit_day=YYYY-MM-DD`, the last UTC day counted;
- `rb_attribution=<source>|<campaign>`, coarse campaign labels kept for up to 30 days.

None of these values is a random or stable visitor id. The app does not collect `document.referrer`, user-agent strings, full browsing URLs, IP addresses, browser fingerprints, or cross-site identifiers.

Source/campaign comes only from explicit `utm_source` / `utm_campaign` (or `source` / `campaign`) query values. Those values are not stored verbatim: they are normalized into small checked-in vocabularies for known channel families and launch experiments. Unrecognized source or campaign text collapses to `other`, preventing arbitrary query-string text from becoming analytics metadata. Placement is likewise limited to `home`, `header`, `hero`, `impact`, `footer`, or `unknown`.

Fundraiser clicks are classified by that coarse page placement. The link destination remains the direct Against Malaria fundraiser.

## BFF boundary

The browser sends events only to Rainbow's same-origin `POST /api/mission/event` route. The BFF rebuilds the request from the strict allowlisted event/source/campaign/placement shape before forwarding it to Kind Robots. Extra browser-supplied fields are discarded rather than proxied.

`GET /api/mission/summary?days=30` proxies the aggregate Kind Robots summary for a bounded 1–90 day window. It contains counts, not visitor records.

## Interpretation

A fundraiser click means only that somebody followed the outbound link. It is **not evidence that a donation occurred**. Against Malaria remains the donation processor, and Rainbow Butterflies cannot identify donors or donation amounts from this instrumentation.

Human/AI contribution counts and useful-object activity are derived from canonical Kind Robots forum and ArtJob records, not from browser self-reporting.

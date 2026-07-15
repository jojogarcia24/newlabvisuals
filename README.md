# All Things REELestate

A cinematic, public-facing website for **All Things REELestate** — a real estate content studio (produced by **New Lab Visuals**) built for realtors and brokerages.

Services front and center: **Headshots · Matterport · Lifestyle Videos · Livestream** — plus cinematic listing films, drone, editorial photography, and a full social content engine.

## The look

The design merges two references the client loves:

- **Elite Living Realty** — bold caps punch, city marquee, high-contrast black/white.
- **Aterra Builders** — warm editorial serif, cream/stone palette, "built to outlast" luxury.

…into one system: a warm cream/ink palette, `Fraunces` editorial serif + `Inter`, an electric-blue accent for pop, a broadcast-red `LIVE` cue, cinematic grain, and scroll-reveal motion. The portfolio section ("Content That Stops the Scroll") mirrors the reel-grid gallery from the client's marketing site.

## Pricing ladder

Built around a deliberate **$995 on-ramp** so newer/budget-conscious agents can say yes, then climb:

| Tier | Price | Role |
| --- | --- | --- |
| Signature | **$995/mo** | The On-Ramp (entry) |
| Pro | $2,195/mo | The Workhorse (most booked) |
| Team | $3,495/mo | Lead + up to 2 agents |
| Brokerage | $5,495/mo | The Premium Anchor |

Full à-la-carte menu included below the tiers. A light Elite Living Realty band promotes partner pricing for new agents onboarding with ELR.

## Structure

```
index.html            # single-page site
assets/css/styles.css # design system + all sections
assets/js/main.js     # nav, scroll reveals, tilt, form, mobile menu
assets/favicon.svg
```

No build step — it's a static site.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Works as-is on **GitHub Pages**, **Netlify**, or **Vercel** (static, no framework). For GitHub Pages, enable Pages on this branch — `.nojekyll` is included so the `assets/` folder is served untouched.

## Making it production-ready

Placeholders are intentional and labeled so real media drops straight in:

- **Hero** — swap the `.hero__media` gradient for a background video or photo (`data-media` on `<section class="hero">`).
- **Portfolio** — the `.reel-feature` and `.reel-tile` blocks are wired to open the contact form on click; replace with real Vimeo/YouTube/MP4 embeds (see the play-button hook in `main.js`).
- **Contact form** — currently a demo (client-side confirmation only). Wire the submit handler in `main.js` to your email service or CRM.
- **Studio image** — replace the `.studio__media` gradient with a real behind-the-lens photo.

---

Produced by New Lab Visuals · `info@thenl3v.com`

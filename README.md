# All Things REELestate

A cinematic, public-facing website for **All Things REELestate** — a real estate content studio (produced by **New Lab Visuals**) built for realtors and brokerages.

Services front and center: **Headshots · Matterport · Lifestyle Videos · Livestream** — plus cinematic listing films, drone, editorial photography, and a full social content engine.

## The look

The design merges two reference aesthetics the client loves — a warm editorial
serif luxury ("built to outlast" energy) and a bold display-caps punch — into
one system: a warm cream/ink palette, `Fraunces` editorial serif + `Inter`, an
electric-blue accent for pop, a broadcast-red `LIVE` cue, cinematic grain, and
scroll-reveal motion. The hero and service cards are photo-driven; the portfolio
section ("Content That Stops the Scroll") is a reel-grid gallery.

## Pricing ladder

Built around a deliberate **$995 on-ramp** so newer/budget-conscious agents can say yes, then climb:

| Tier | Price | Role |
| --- | --- | --- |
| Signature | **$995/mo** | The On-Ramp (entry) |
| Pro | $2,195/mo | The Workhorse (most booked) |
| Team | $3,495/mo | Lead + up to 2 agents |
| Brokerage | $5,495/mo | The Premium Anchor |

Full à-la-carte menu included below the tiers.

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

The hero and service cards ship with high-quality stock photography (Unsplash
CDN) so the site looks finished immediately. Every image is a one-line swap for
your own studio work, and each has a duotone gradient fallback so nothing breaks
if a photo can't load.

- **Hero photo** — swap the `url()` in `.hero__media` (`assets/css/styles.css`) for your own film still or listing shot.
- **Service card photos** — swap the `background-image` `url()` on each `.svc-card__img` in `index.html` (Headshots, Matterport, Lifestyle Videos, Livestream).
- **Portfolio** — the `.reel-feature` and `.reel-tile` blocks are wired to open the contact form on click; replace with real Vimeo/YouTube/MP4 embeds (see the play-button hook in `main.js`).
- **Contact form** — currently a demo (client-side confirmation only). Wire the submit handler in `main.js` to your email service or CRM.
- **Studio image** — replace the `.studio__media` gradient with a real behind-the-lens photo.
- **Phone** — add a contact number in the contact and form sections when ready.

---

Produced by New Lab Visuals · `info@thenl3v.com`

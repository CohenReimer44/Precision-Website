# Precision Christmas Lighting

Marketing site for Precision Christmas Lighting. Plain HTML, CSS, and JavaScript — no framework build step.

## Pages

- `index.html` — hero, scroll-driven 3D lightbulb stage, work portfolio with Show more, five-step process, quote call to action
- `quote.html` — quote form with required-field validation and an on-page success state

The 3D stage loads Three.js from a CDN (`js/model-scroll.js`) and spins a lightbulb as you scroll.

## Run locally

From this folder:

```bash
npx --yes serve -l tcp://0.0.0.0:4317
```

Or with Python:

```bash
python -m http.server 4317 --bind 0.0.0.0
```

Open [http://localhost:4317](http://localhost:4317).

## Design notes

- Sharp corners only (no border radius)
- No drop shadows or outer glow
- Palette: ink `#0C0C0C`, paper `#F3F0E8`, lime `#99FF07`, evergreen accents
- Logo: `precision-christmas-logo.svg` (vectors from the Precision Christmas Lighting PDF)
- House photos live in `work/` and are credited in the footer

# Alif Letters On Cork

Build “Letters for Alif” — a single-page, cozy scrapbook website where friends write letters to Alif, and each letter gets pinned to a shared corkboard that slowly fills up over time. Use React + Tailwind + Framer Motion + Supabase (Lovable Cloud). No accounts needed for writers. The attached screenshot is the visual reference for the corkboard collage style.

SCENE (the whole homepage is one “room”)
- Background: a plain, softly textured off-white/cream painted wall, with a subtle paper-grain noise overlay and a soft vignette.
- Center: a large framed corkboard. Light-wood frame with a slight bevel and shadow, and a realistic cork texture (warm brown, speckled). It takes ~80% width on desktop, keeps a 16:10 ratio, and is horizontally scrollable/pannable on mobile (pinch-zoom optional).
- Around the corkboard: “Pop Mart figure” decorations — 4–6 absolutely positioned image slots (e.g. on a small wall shelf to the left, standing on the frame’s top edge, peeking from the bottom-right corner). Use placeholder PNGs for now and keep them in a config array {src, x, y, rotation, scale} so I can swap in my own cut-out photos. Each figure does a tiny idle bob and wiggles on hover/tap. Do NOT draw or generate any branded characters — placeholders only.
- Top-left handwritten title on the wall: “for alif ♡” (font: “Caveat” or “Reenie Beanie”). A small counter below it: “{n} letters pinned”.

THE CORKBOARD FILLING UP
- At first the board is nearly empty: just 2–3 decorative pins and a little sticky note “pin something for alif :)”.
- Each submitted letter appears on the board as a collage item: a folded letter, envelope, polaroid or postcard (based on the style the writer picked). Each item has:
  - a random slight rotation (-8° to 8°)
  - a colored push-pin or washi-tape strip on top
  - a drop shadow
  - a front showing “from {name}” plus their chosen sticker
- Placement: an auto-layout that packs items into free spots without big overlaps (a grid of slots with jitter), so the board gradually fills edge to edge like the reference. Store x/y/rotation in the DB so positions stay stable for everyone.
- New letters animate in: they drop from above, wobble, and a pin “thunk” sound plays (with a mute toggle).
- Realtime: use Supabase realtime so new letters appear live for everyone viewing.
- Clicking an item opens it.

WRITE BUTTON + LETTER CUSTOMISER
- A fixed bottom-right floating button, styled like a hand-cut paper tag with a slight tilt: “✉ write alif a letter”. It bounces gently every few seconds.
- It opens a modal (“letter studio”) with a live preview on top or left, and step tabs:
  1. Style: choose a paper type — lined notebook, kraft envelope, airmail, polaroid, postcard, grid paper, pastel pink, cream.
  2. Write: “Open when…” label (presets: “you miss me”, “you need a laugh”, “it’s your birthday”, “you’re stressed”, “you can’t sleep”, or custom); the letter body (rich-ish text, max 2000 chars); a font choice (Caveat, Patrick Hand, Special Elite typewriter, Inter); ink color.
  3. Decorate: drag-and-drop stickers onto the letter (hearts, stars, cherries, stamps, flowers, doodles — original emoji/SVG set); an optional photo upload (shown as a taped polaroid); a pin/tape color.
  4. Seal: a wax seal color + symbol picker; a hand-drawn signature pad (canvas); “From:” name (or “anonymous”); an optional “open on” unlock date (the letter shows locked with a countdown until then).
- “Pin it to the board” button. Then close the modal, scroll to the new item and play its drop-in animation.

OPENING A LETTER
- Click a board item → a fullscreen dim overlay. The envelope zooms to center, the wax seal cracks on click (Framer Motion), the envelope flap opens, and the letter slides out and unfolds.
- Show the paper style, font, stickers, photo, signature, and the “open when…” label at the top.
- Locked letters show a padlock and a countdown, and can’t be opened yet.
- Close with an X, an outside click or Esc.

DATA (Supabase)
letters table:
- id
- from_name
- open_when_label
- body
- paper_style
- font
- ink_color

- stickers (jsonb: [{type, x, y, rotation, scale}])

- photo_url

- signature_url

- seal_color

- seal_symbol

- pin_color

- unlock_at (nullable)

- board_x, board_y, rotation

- created_at

Storage buckets: photos, signatures.

RLS:

- Anon can insert and select.

- Rate-limit by browser: 5 letters per hour.



STYLE

- Cozy, tactile, Y2K-scrapbook collage feel, like the reference: paper textures, tape, stamps, slight grain.

- Palette: cream wall #F4EFE6, cork #B8865B, frame wood #C9A46A, ink #2B2B2B, accents cherry red #D7263D, baby blue #9CC9E8, butter yellow #F6E27A.

- Soft shadows everywhere. Nothing perfectly straight.

- Fully responsive. On mobile the board is pannable, the write button stays bottom-right, and the modal is a full-screen sheet.



SEED

- Insert 3 sample letters so the board isn’t empty during the demo.

- Add an /admin route (password from an env var) to delete letters.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/803ceb83-5db3-4811-84e2-4fef40d2bd51).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

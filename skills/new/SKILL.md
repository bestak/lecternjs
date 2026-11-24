---
name: new
description: Start a new animated HTML presentation (talk, pitch, lecture deck) from the lecternjs template. Asks for the talk details, copies the template into a new folder, and fills the parts, timing, speakers, language, and a slide skeleton with speaker notes. Use when the user wants a new deck, slides, or presentation built with lecternjs or as plain HTML.
---

# New lecternjs deck

The template lives in this plugin. Plugin root = this skill's base directory, two levels up (`../..`).

## 1. Ask

Ask in one message. Skip what the user already said.

- Topic and goal: what the audience should do or remember.
- Audience.
- Length in minutes.
- Parts: the story structure (for example hook → problem → solution → ask). Offer one if the user has none.
- Speakers: name and initials per speaker, or one speaker.
- Language of the slides.
- Target folder. Default: `./<slug>` in the current directory.

## 2. Copy

Copy from the plugin root into the target folder: `index.html`, `deck.css`, `deck.js`, `assets/fonts/`, `scripts/export.py`, `.gitignore`. Do not copy `skills/`, `.claude-plugin/`, `.github/`, `scripts/record_gif.py`, or `README.md`. Stop if the folder exists and is not empty.

## 3. Fill

Edit only `index.html` and the theme block at the top of `deck.css`. Leave `deck.js` alone.

- `<html lang>`: the slide language. It sets the number format.
- `<title>`: the talk title.
- `window.DECK.parts`: one key per part, `{ name, min }`. The minutes add up to the talk length.
- `window.DECK.speakers`: `{ initials: 'Full Name' }`. Leave `{}` for one speaker.
- `window.DECK.labels`: for a non-English talk, translate the presenter labels. The keys are in the `L` object at the top of `deck.js`.
- Slides: replace the demo `<section>`s. One `<section class="slide" data-part="…" data-title="…">` per slide. Add `data-who` when there are speakers.
- Each slide gets `<aside class="notes">` with what to say. Mark each click in the notes with `<em>Click</em>`.
- `deck.css`: add one `#stage[data-part=…]` line per part for the background colours. Remove the demo part lines.
- Remove the `/* demo slides */` CSS block when no slide uses it any more.

The engine features are in the template README.

## 4. Motion

If the `motion-design:motion-design` skill is available, load it before you add motion beyond the built-in effects. Otherwise use only the built-in effects.

## 5. Check

- Open `index.html` in Chrome. Click through every step. Press `P` and check the presenter window.
- `uv run scripts/export.py` writes `out/deck.pdf` with no `pageerror` lines. Look at the PNGs in `out/shots/`.
- Tell the user the folder, the slide count, and the planned length.

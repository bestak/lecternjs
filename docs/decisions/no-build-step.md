# Plain static files, no build step

A deck is `index.html`, `deck.css`, and `deck.js` loaded as classic scripts.

Chrome blocks `fetch()` and module scripts on `file://`. Plain files keep "double-click `index.html`, works offline". One HTML file is also the easiest format for an AI to edit.

Revisit when decks pass about 40 slides or share slide components. Then add an optional build that outputs one file.

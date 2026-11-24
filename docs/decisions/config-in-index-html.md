# Deck config lives in index.html, English labels by default

`window.DECK` in `index.html` holds the parts, the speakers, and label overrides. `deck.js` is the same in every deck.

The presenter UI is English. A deck in another language overrides `labels`. `<html lang>` sets the number format.

Why: a new deck changes one file. Engine fixes copy over by replacing `deck.js`.

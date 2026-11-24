# Export is screenshots of each step

`scripts/export.py` drives the deck in headless Chrome with `?preview` (animations off). It saves one PNG per slide or per click (`--beats`). It joins them into a PDF and a PPTX. The PPTX gets the speaker notes.

Why: exact match with the live deck in about 80 lines. Editable PPTX text would mean rebuilding every layout in PowerPoint terms.

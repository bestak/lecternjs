#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright", "pillow", "python-pptx"]
# ///
# Exports the deck as images: PNG per page, then PDF and PPTX (notes become speaker notes).
# Run: uv run scripts/export.py [--beats] [--out out] [--formats pdf,pptx,png]
import argparse
import asyncio
from pathlib import Path

from PIL import Image
from playwright.async_api import async_playwright
from pptx import Presentation
from pptx.util import Emu

ROOT = Path(__file__).resolve().parent.parent


async def capture(shots: Path, beats: bool, wait: float) -> list[tuple[Path, str]]:
    shots.mkdir(parents=True, exist_ok=True)
    pages = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="chrome")
        page = await browser.new_page(viewport={"width": 1920, "height": 1080})
        page.on("pageerror", lambda e: print("pageerror:", e))
        await page.goto((ROOT / "index.html").as_uri() + "?preview")
        await page.evaluate("document.fonts.ready")
        n = await page.evaluate("slides.length")
        for i in range(n):
            last = await page.evaluate(f"steps[{i}]")
            notes = await page.evaluate(f"slides[{i}].querySelector('.notes')?.innerText.trim() ?? ''")
            for s in range(last + 1) if beats else [last]:
                await page.evaluate(f"go({i}, {s})")
                await page.wait_for_timeout(wait * 1000)
                path = shots / (f"{i + 1:02d}-{s}.png" if beats else f"{i + 1:02d}.png")
                await page.screenshot(path=str(path))
                pages.append((path, notes))
        await browser.close()
    return pages


def to_pdf(pages, out: Path):
    images = [Image.open(p).convert("RGB") for p, _ in pages]
    images[0].save(out, save_all=True, append_images=images[1:], resolution=144)


def to_pptx(pages, out: Path):
    prs = Presentation()
    prs.slide_width, prs.slide_height = Emu(12192000), Emu(6858000)
    for path, notes in pages:
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        slide.shapes.add_picture(str(path), 0, 0, prs.slide_width, prs.slide_height)
        slide.notes_slide.notes_text_frame.text = notes
    prs.save(out)


async def main(a):
    out = Path(a.out)
    formats = set(a.formats.split(","))
    pages = await capture(out / "shots", a.beats, a.wait)
    assert pages, "deck has no slides"
    if "pdf" in formats:
        to_pdf(pages, out / "deck.pdf")
    if "pptx" in formats:
        to_pptx(pages, out / "deck.pptx")
    print(f"ok {len(pages)} pages → {out}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--beats", action="store_true", help="one page per click, not per slide")
    ap.add_argument("--out", default=str(ROOT / "out"))
    ap.add_argument("--formats", default="pdf,pptx,png")
    ap.add_argument("--wait", type=float, default=0.4)
    asyncio.run(main(ap.parse_args()))

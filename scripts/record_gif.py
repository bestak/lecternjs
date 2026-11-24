#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright"]
# ///
# Records the deck as a GIF (clicks through every step) and screenshots the presenter window. Needs ffmpeg.
# Run: uv run scripts/record_gif.py [--out .github/media] [--hold 1.8] [--width 960]
import argparse
import asyncio
import subprocess
import tempfile
import time
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
SIZE = {"width": 1280, "height": 720}


async def record(out: Path, hold: float) -> tuple[Path, float]:
    tmp = Path(tempfile.mkdtemp())
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="chrome")
        ctx = await browser.new_context(viewport=SIZE, record_video_dir=str(tmp), record_video_size=SIZE)
        page = await ctx.new_page()
        started = time.monotonic()
        page.on("pageerror", lambda e: print("pageerror:", e))
        await page.goto((ROOT / "index.html").as_uri())
        await page.evaluate("document.fonts.ready.then(() => 0)")
        await page.wait_for_timeout(300)
        skip = time.monotonic() - started
        await page.wait_for_timeout(hold * 1500)
        clicks = await page.evaluate("steps.reduce((a, s) => a + s, 0) + slides.length - 1")
        for _ in range(clicks):
            await page.keyboard.press("ArrowRight")
            await page.wait_for_timeout(hold * 1000)
        await page.wait_for_timeout(hold * 500)
        await page.close()
        video = Path(await page.video.path())
        await ctx.close()

        ctx = await browser.new_context(viewport=SIZE)
        page = await ctx.new_page()
        await page.goto((ROOT / "index.html").as_uri() + "#2")
        async with ctx.expect_page() as popup:
            await page.keyboard.press("p")
        pres = await popup.value
        await pres.set_viewport_size({"width": 1400, "height": 820})
        await page.keyboard.press("ArrowRight")
        await page.keyboard.press("ArrowRight")
        await pres.wait_for_timeout(1500)
        await pres.screenshot(path=str(out / "presenter.png"))
        await browser.close()
    return video, skip


def to_gif(video: Path, gif: Path, width: int, skip: float):
    vf = f"fps=12,scale={width}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{skip:.2f}", "-i", str(video), "-vf", vf, str(gif)], check=True)


async def main(a):
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    video, skip = await record(out, a.hold)
    to_gif(video, out / "demo.gif", a.width, skip)
    print(f"ok → {out / 'demo.gif'}, {out / 'presenter.png'}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / ".github" / "media"))
    ap.add_argument("--hold", type=float, default=1.8, help="seconds per step")
    ap.add_argument("--width", type=int, default=960)
    asyncio.run(main(ap.parse_args()))

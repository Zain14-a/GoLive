# GoLive browser regression suites

Playwright (Python) checks for the landing and chat pages. They verify theme
switching, language switching and RTL/LTR direction, the full-bleed hero with its
contained inner shell, the hero form and FAQ accordion, the chat filter chips
(including the dynamically injected AI chip), the AI face-filter overlay, mobile
topbar/composer layout, and that no viewport has real document overflow.

## Prerequisites

- Python 3 with `playwright` installed: `pip install playwright`
- Chromium downloaded once: `playwright install chromium`
- The app running on `http://localhost:3000` (start it with `npm start`)

`BASE` in `regress_lib.py` points at that local URL.

## Running

Run from the repository root so `regress_lib` resolves:

```
python tests/test_landing.py
python tests/test_chat.py
```

Each suite prints a PASS/FAIL table, the console-error count, and any HTTP
responses at or above 400. The exit code is non-zero when a check fails.

## Notes

- The AI-chip checks stream model weights from a CDN and wait for that download,
  so `test_chat.py` needs network access and takes noticeably longer than
  `test_landing.py`.
- Run the two suites one after the other. Face detection keeps the main thread
  busy in headless Chromium, and running both at once can starve the renderer.
- Real camera capture still needs manual verification; the suites use Chromium's
  fake media device.
"""Shared helpers for the GoLive interaction regression suites."""
import json
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
RESULTS = []
CONSOLE = []
FAILED = []


def ok(name, passed, info=""):
    RESULTS.append((name, bool(passed), str(info)[:220]))


def attach(page, tag):
    def on_console(msg):
        if msg.type != "error":
            return
        t = msg.text
        if any(k in t for k in ("Camera not supported", "Permission", "permissions-policy",
                                "favicon", "net::ERR_")):
            return
        CONSOLE.append(f"{tag}: {t[:170]}")

    def on_error(exc):
        CONSOLE.append(f"{tag} PAGEERROR: {str(exc)[:170]}")

    page.on("response", lambda r: FAILED.append(
        f"{r.status} {r.url}") if r.status >= 400 else None)
    page.on("console", on_console)
    page.on("pageerror", on_error)


OVERFLOW_JS = """
() => {
  const de = document.documentElement;
  const bad = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > de.clientWidth + 1.5 || r.left < -1.5) {
      const ox = getComputedStyle(el).overflowX;
      if (ox === 'auto' || ox === 'scroll') continue;
      let p = el.parentElement, scroller = false;
      while (p) {
        const po = getComputedStyle(p).overflowX;
        if (po === 'auto' || po === 'scroll') { scroller = true; break; }
        p = p.parentElement;
      }
      if (scroller) continue;
      bad.push(el.tagName + '.' + String(el.className || '').slice(0, 40) +
                ' L' + Math.round(r.left) + ' R' + Math.round(r.right));
    }
  }
  return { scrollW: de.scrollWidth, clientW: de.clientWidth, bad: bad.slice(0, 6) };
}
"""


def overflow(page):
    o = page.evaluate(OVERFLOW_JS)
    ok("_overflow " + " ".join(str(x) for x in ()),
       o["scrollW"] <= o["clientW"] + 1 and not o["bad"], json.dumps(o))
    return o


def check_no_overflow(page, label):
    o = page.evaluate(OVERFLOW_JS)
    ok(label, o["scrollW"] <= o["clientW"] + 1 and not o["bad"], json.dumps(o))
    return o


def pick_lang(page, code):
    page.locator("#langToggle").first.click()
    page.wait_for_timeout(350)
    page.locator(".lang-item", has_text=code.upper()).first.click()
    page.wait_for_timeout(900)


def report():
    print("\n===== RESULTS =====")
    fails = 0
    for name, passed, info in RESULTS:
        if name.startswith("_"):
            continue
        print(("PASS  " if passed else "FAIL  ") + name + ("  :: " + info if info else ""))
        if not passed:
            fails += 1
    total = len([r for r in RESULTS if not r[0].startswith("_")])
    print(f"\n{total - fails}/{total} passed")
    print(f"Console errors: {len(CONSOLE)}")
    for e in CONSOLE[:15]:
        print("    " + e)
    import collections
    seen = collections.Counter(FAILED)
    print(f"HTTP >=400 responses: {len(FAILED)} ({len(seen)} unique)")
    for u, c in seen.most_common(10):
        print(f"    {c}x {u}")
    return fails


def mobile_ctx(browser, color="dark"):
    return browser.new_context(viewport={"width": 390, "height": 844},
                               device_scale_factor=2, is_mobile=True, has_touch=True,
                               color_scheme=color,
                               permissions=["camera", "microphone"])
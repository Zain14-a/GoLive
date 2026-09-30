"""Chat regression: filter chips, AI chip, theme, language, RTL/mobile layout."""
import sys, json
from playwright.sync_api import sync_playwright
from regress_lib import BASE, ok, attach, check_no_overflow, pick_lang, report, mobile_ctx

CAM = ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]

CLIP_JS = """
() => {
  const bar = document.querySelector('.chat-topbar');
  if (!bar) return ['no-topbar'];
  const br = bar.getBoundingClientRect();
  return [...bar.querySelectorAll('*')]
    .filter(e => e.textContent.trim() && e.getBoundingClientRect().right > br.right + 1)
    .map(e => (e.id || e.className) + '|' + Math.round(e.getBoundingClientRect().right));
}
"""

with sync_playwright() as pw:
    browser = pw.chromium.launch(args=["--no-sandbox"] + CAM)

    # ---------------- desktop ----------------
    ctx = browser.new_context(viewport={"width": 1440, "height": 900},
                              permissions=["camera", "microphone"])
    page = ctx.new_page()
    # Face detection saturates the headless main thread, so actionability
    # checks can take a long time here; give them plenty of room.
    page.set_default_timeout(120000)
    attach(page, "chat")
    page.goto(BASE + "/chat?lang=en", wait_until="domcontentloaded")
    page.wait_for_selector("#aiFilterToggle", timeout=20000)
    page.wait_for_timeout(1500)

    chips = page.locator("#filtersBar .filter-chip")
    cn = chips.count()
    ok("chat filter chips rendered (incl. dynamic AI)", cn >= 10, f"count={cn}")

    ai = page.locator("#aiFilterToggle")
    ok("AI filter chip injected once", ai.count() == 1, f"count={ai.count()}")
    ok("AI chip styled as filter-chip",
       ai.evaluate("e => e.classList.contains('filter-chip')") if ai.count() else False)

    statics = page.locator("#filtersBar .filter-chip:not(#aiFilterToggle)")
    statics.nth(1).click()
    page.wait_for_timeout(500)
    ok("static chip activates", statics.nth(1).evaluate("e => e.classList.contains('active')"))

    statics.nth(3).click()
    page.wait_for_timeout(500)
    active_after = statics.evaluate_all(
        "els => els.filter(e => e.classList.contains('active')).length")
    ok("static chips single-select", active_after == 1, f"active={active_after}")

    ai.click()
    # weights stream from a CDN; the chip stays disabled until they arrive
    page.wait_for_function(
        "() => !document.getElementById('aiFilterToggle').disabled", timeout=90000)
    page.wait_for_timeout(800)
    ai_active = ai.evaluate("e => e.classList.contains('active')")
    ok("AI chip toggles active", ai_active, f"aiActive={ai_active}")
    ok("AI overlay canvas mounted",
       page.evaluate("!!document.getElementById('faceCanvas')"))
    ok("AI overlay does not block clicks",
       page.evaluate("""() => {
          const c = document.getElementById('faceCanvas');
          return !!c && getComputedStyle(c).pointerEvents === 'none';
       }"""))

    statics.nth(0).click(timeout=60000)
    page.wait_for_timeout(600)
    ai_still = ai.evaluate("e => e.classList.contains('active')")
    statics_active = statics.evaluate_all(
        "els => els.filter(e => e.classList.contains('active')).length")
    ok("AI chip survives static chip selection", ai_still, f"ai still active={ai_still}")
    ok("static single-select still holds with AI on", statics_active == 1,
       f"statics={statics_active}")

    ai.click(timeout=60000)
    page.wait_for_timeout(1500)
    ok("AI chip untoggles", not ai.evaluate("e => e.classList.contains('active')"))
    ok("AI overlay removed on stop",
       not page.evaluate("!!document.getElementById('faceCanvas')"))

    c0 = page.get_attribute("html", "data-theme")
    page.locator("#themeToggleChat").click()
    page.wait_for_timeout(600)
    ok("chat theme toggle", c0 != page.get_attribute("html", "data-theme"),
       f"{c0} -> {page.get_attribute('html', 'data-theme')}")

    # chat control buttons exist and are reachable
    for sel in ["#skipBtn", "#stopBtn", "#muteBtn", "#camBtn", "#sendBtn", "#msgInput"]:
        loc = page.locator(sel)
        box = loc.bounding_box() if loc.count() else None
        ok(f"chat control {sel} present in viewport",
           loc.count() == 1 and box and box["x"] >= -1 and box["x"] + box["width"] <= 1441,
           f"count={loc.count()} box={box}")

    pick_lang(page, "ar")
    ok("chat lang -> rtl", page.get_attribute("html", "dir") == "rtl")
    check_no_overflow(page, "chat desktop RTL no overflow")

    pick_lang(page, "en")
    ok("chat lang -> ltr", page.get_attribute("html", "dir") == "ltr")
    check_no_overflow(page, "chat desktop LTR no overflow")

    body_txt = page.inner_text("body")
    import re as _re
    glued = [w for w in _re.findall(r"[A-Za-z]{2,}[A-Z][a-z]", body_txt)
             if not _re.match(r"^GoL(i|ive)$", w)]
    ok("chat body text has no glued words", not glued, json.dumps(glued[:5]))

    send = page.locator("#sendBtn").bounding_box()
    ok("chat send button in viewport", send and send["x"] + send["width"] <= 1441, f"{send}")
    ok("chat composer input present", page.locator("#msgInput").count() == 1)
    ok("chat topbar children not clipped (desktop)", page.evaluate(CLIP_JS) == [],
       json.dumps(page.evaluate(CLIP_JS)[:4]))
    ctx.close()

    # ---------------- mobile RTL ----------------
    ctx = mobile_ctx(browser)
    page = ctx.new_page()
    attach(page, "chat-m")
    page.goto(BASE + "/chat?lang=ar", wait_until="domcontentloaded")
    page.wait_for_selector("#aiFilterToggle", timeout=20000)
    page.wait_for_timeout(1500)

    check_no_overflow(page, "chat mobile RTL no overflow")

    bar = page.locator(".chat-topbar").bounding_box()
    ok("chat mobile topbar within viewport",
       bar and bar["width"] <= 391 and bar["x"] >= -1, f"{bar}")

    status = page.evaluate("""
      () => {
        const el = document.getElementById('statusLabel');
        if (!el) return null;
        const cs = getComputedStyle(el);
        return { display: cs.display, w: Math.round(el.getBoundingClientRect().width) };
      }""")
    ok("chat mobile status label handled",
       status and (status["display"] == "none" or status["w"] < 200), json.dumps(status))

    bottom = page.locator(".chat-bottom").bounding_box()
    ok("chat mobile bottom panel within viewport", bottom and bottom["width"] <= 391, f"{bottom}")

    fbar = page.locator("#filtersBar").evaluate(
        "e => ({ow: e.offsetWidth, sw: e.scrollWidth, ox: getComputedStyle(e).overflowX})")
    ok("chat filter bar is horizontal scroller",
       fbar["ow"] >= fbar["sw"] - 2 or fbar["ox"] in ("auto", "scroll"), json.dumps(fbar))

    ok("chat mobile topbar children not clipped", page.evaluate(CLIP_JS) == [],
       json.dumps(page.evaluate(CLIP_JS)[:4]))
    ctx.close()

    browser.close()

sys.exit(1 if report() else 0)
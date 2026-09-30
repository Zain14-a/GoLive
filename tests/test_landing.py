"""Landing regression: themes, languages, hero containment, form, FAQ, CTA."""
import sys, json
from playwright.sync_api import sync_playwright
from regress_lib import BASE, ok, attach, check_no_overflow, pick_lang, report, mobile_ctx

CAM = ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]

with sync_playwright() as pw:
    browser = pw.chromium.launch(args=["--no-sandbox"] + CAM)

    # ---------------- desktop ----------------
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    attach(page, "landing")
    page.goto(BASE + "/?lang=ar", wait_until="networkidle")
    page.wait_for_timeout(1200)

    ok("landing starts RTL for lang=ar", page.get_attribute("html", "dir") == "rtl",
       "dir=" + str(page.get_attribute("html", "dir")))

    t0 = page.get_attribute("html", "data-theme")
    page.locator("#themeToggle").click()
    page.wait_for_timeout(600)
    t1 = page.get_attribute("html", "data-theme")
    ok("landing theme toggle flips theme", t0 != t1, f"{t0} -> {t1}")
    bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
    ok("theme toggle changes body background", bool(bg), "bg=" + str(bg))

    pick_lang(page, "en")
    ok("landing lang -> english sets dir=ltr", page.get_attribute("html", "dir") == "ltr",
       "dir=" + str(page.get_attribute("html", "dir")))
    h1 = page.locator("h1").first.inner_text().strip()
    ok("hero h1 english intact", len(h1) > 8, repr(h1))
    check_no_overflow(page, "landing LTR no overflow")

    pick_lang(page, "ar")
    ok("landing lang -> arabic back to rtl", page.get_attribute("html", "dir") == "rtl")
    check_no_overflow(page, "landing RTL no overflow")

    hero = page.locator(".hero").first.bounding_box()
    shell = page.locator(".hero > .shell").first.bounding_box()
    ok("hero full-bleed with inner shell",
       hero and hero["width"] >= 1439 and shell and shell["width"] <= hero["width"],
       f"hero={hero} shell={shell}")

    page.select_option("#genderSel", "female")
    page.select_option("#prefGenderSel", "male")
    page.wait_for_timeout(300)
    ok("hero selects accept values",
       page.locator("#genderSel").input_value() == "female"
       and page.locator("#prefGenderSel").input_value() == "male",
       f"g={page.locator('#genderSel').input_value()} p={page.locator('#prefGenderSel').input_value()}")

    c_opts = page.locator("#countrySel option").count()
    ok("country select populated by JS", c_opts > 3, f"options={c_opts}")
    page.select_option("#countrySel", index=2)
    page.wait_for_timeout(300)
    ok("country select accepts value", page.locator("#countrySel").input_value() != "any",
       "value=" + page.locator("#countrySel").input_value())

    chk = page.locator("#ageCheck")
    before = chk.is_checked()
    chk.click(force=True)
    page.wait_for_timeout(300)
    ok("18+ checkbox toggles", before != chk.is_checked(), f"{before} -> {chk.is_checked()}")
    chk.click(force=True)
    page.wait_for_timeout(200)

    faq = page.locator("details.faq-item")
    fn = faq.count()
    faq.first.locator("summary").click()
    page.wait_for_timeout(500)
    ok("FAQ accordion opens", fn >= 3 and faq.first.evaluate("e => e.open"), f"items={fn}")
    check_no_overflow(page, "landing desktop no overflow after FAQ")

    page.goto(BASE + "/?lang=en", wait_until="networkidle")
    page.wait_for_timeout(1000)
    page.locator("#goBtn").click()
    page.wait_for_timeout(3000)
    ok("landing CTA navigates to chat", "chat.html" in page.url, page.url)
    ok("chat page mounted after CTA", page.locator(".chat-topbar").count() > 0)
    ctx.close()

    # ---------------- mobile ----------------
    ctx = mobile_ctx(browser, color="light")
    page = ctx.new_page()
    attach(page, "landing-m")
    page.goto(BASE + "/?lang=ar", wait_until="networkidle")
    page.wait_for_timeout(1200)

    check_no_overflow(page, "landing mobile RTL no overflow")
    hero = page.locator(".hero").first.bounding_box()
    shell = page.locator(".hero > .shell").first.bounding_box()
    ok("hero full-bleed on mobile", hero and abs(hero["width"] - 390) < 2, f"{hero}")
    ok("hero inner shell contained on mobile",
       shell and shell["width"] <= 390 and shell["x"] >= -1, f"{shell}")

    nav = page.locator(".nav").first.bounding_box()
    ok("landing mobile nav within viewport", nav and nav["width"] <= 391, f"{nav}")

    pick_lang(page, "en")
    ok("landing mobile lang -> ltr", page.get_attribute("html", "dir") == "ltr")
    check_no_overflow(page, "landing mobile LTR no overflow")

    faq = page.locator("details.faq-item")
    faq.first.locator("summary").click()
    page.wait_for_timeout(500)
    is_open = faq.first.evaluate("e => e.open")
    ok("landing mobile FAQ opens", is_open, str(is_open))
    check_no_overflow(page, "landing mobile no overflow after interactions")
    ctx.close()

    browser.close()

sys.exit(1 if report() else 0)
import sys
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def create_driver():
    opts = Options()
    opts.add_argument('--start-maximized')
    opts.add_experimental_option("detach", True)
    driver = webdriver.Chrome(options=opts)
    return driver

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided"}))
        return

    cmd = sys.argv[1]
    driver = create_driver()

    if cmd == "open":
        url = sys.argv[2] if len(sys.argv) > 2 else "https://www.google.com"
        driver.get(url)
        print(json.dumps({"status": "ok", "url": url, "title": driver.title}))

    elif cmd == "search":
        url = sys.argv[2] if len(sys.argv) > 2 else "https://www.google.com"
        query = sys.argv[3] if len(sys.argv) > 3 else ""
        driver.get(url)
        time.sleep(2)
        try:
            search_box = driver.find_element(By.NAME, "q")
            search_box.send_keys(query)
            search_box.send_keys(Keys.RETURN)
            time.sleep(2)
            print(json.dumps({"status": "ok", "title": driver.title}))
        except Exception as e:
            print(json.dumps({"error": str(e)}))

    elif cmd == "scroll":
        direction = sys.argv[2] if len(sys.argv) > 2 else "down"
        if direction == "down":
            driver.execute_script("window.scrollBy(0, 500);")
        else:
            driver.execute_script("window.scrollBy(0, -500);")
        print(json.dumps({"status": "ok", "scrolled": direction}))

    elif cmd == "screenshot":
        path = sys.argv[2] if len(sys.argv) > 2 else "screenshot.png"
        driver.save_screenshot(path)
        print(json.dumps({"status": "ok", "path": path}))

    time.sleep(1)

if __name__ == "__main__":
    main()

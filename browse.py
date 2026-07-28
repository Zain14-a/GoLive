from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import time
import sys

url = sys.argv[1] if len(sys.argv) > 1 else "https://www.tiktok.com/"
scrolls = int(sys.argv[2]) if len(sys.argv) > 2 else 10

opts = Options()
opts.add_argument("--start-maximized")
opts.add_experimental_option("detach", True)

driver = webdriver.Chrome(options=opts)
driver.get(url)
print(f"Opened: {url}")
time.sleep(4)

for i in range(scrolls):
    time.sleep(2)
    driver.execute_script("window.scrollBy(0, window.innerHeight);")
    print(f"Scroll {i+1}/{scrolls}")

print("Done! Browser stays open.")

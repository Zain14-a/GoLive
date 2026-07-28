from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import os

profile_path = os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\User Data")

opts = Options()
opts.add_argument("--user-data-dir=" + profile_path)
opts.add_argument("--profile-directory=Default")
opts.add_experimental_option("excludeSwitches", ["enable-automation"])
opts.add_experimental_option("detach", True)

driver = webdriver.Chrome(options=opts)
driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
    "source": "Object.defineProperty(navigator, 'webdriver', { get: () => undefined })"
})

driver.get("https://search.google.com/search-console/add?hl=en")
time.sleep(5)
print("Search Console opened!")
print("Look for 'HTML tag' option and click it")

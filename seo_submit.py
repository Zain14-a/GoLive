from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
import time

opts = Options()
opts.add_argument("--start-maximized")
opts.add_experimental_option("detach", True)

driver = webdriver.Chrome(options=opts)
driver.get("https://search.google.com/search-console")
print("Google Search Console opened!")
print("Site URL: https://golive-1-tgzr.onrender.com/")
print("Please log in to your Google account if needed.")

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import time

opts = Options()
opts.add_experimental_option("debuggerAddress", "127.0.0.1:9222")
driver = webdriver.Chrome(options=opts)
print("URL:", driver.current_url[:100])

# Click "Other verification methods"
for txt in ["Other", "أخرى", "other"]:
    try:
        el = driver.find_element(By.XPATH, "//*[contains(text(),'" + txt + "')]")
        driver.execute_script("arguments[0].click();", el)
        time.sleep(1)
        print("Clicked:", txt)
        break
    except:
        pass

# Select "HTML tag"
for txt in ["HTML tag", "meta tag", "Meta tag"]:
    try:
        el = driver.find_element(By.XPATH, "//*[contains(text(),'" + txt + "')]")
        driver.execute_script("arguments[0].click();", el)
        time.sleep(1)
        print("Selected:", txt)
        break
    except:
        pass

# Click Verify
for txt in ["Verify", "تحقق", "verify"]:
    try:
        el = driver.find_element(By.XPATH, "//*[text()='" + txt + "']")
        driver.execute_script("arguments[0].click();", el)
        print("Clicked:", txt)
        time.sleep(3)
        break
    except:
        pass

print("Final URL:", driver.current_url[:100])
print("Title:", driver.title[:100])

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.remote.webdriver import WebDriver
import time
import json
import sys
import os

CONNECT_FILE = "browser_port.txt"

def get_existing_driver():
    """Try to connect to existing browser via remote debugging"""
    if os.path.exists(CONNECT_FILE):
        with open(CONNECT_FILE) as f:
            port = f.read().strip()
        try:
            driver = webdriver.Remote(
                command_executor=f"http://127.0.0.1:{port}/json/version",
                options=Options()
            )
            return driver
        except:
            pass
    return None

def create_new_driver():
    """Create new browser with remote debugging enabled"""
    opts = Options()
    opts.add_argument('--start-maximized')
    opts.add_experimental_option("detach", True)
    opts.add_experimental_option("debuggerAddress", "127.0.0.1:9222")
    
    try:
        driver = webdriver.Chrome(options=opts)
        return driver
    except:
        # If debugger address not available, create fresh
        opts2 = Options()
        opts2.add_argument('--start-maximized')
        opts2.add_experimental_option("detach", True)
        driver = webdriver.Chrome(options=opts2)
        return driver

def main():
    if len(sys.argv) < 2:
        print("Usage: python browser_ctrl.py <command> [args]")
        return

    cmd = sys.argv[1]
    
    if cmd == "open":
        url = sys.argv[2] if len(sys.argv) > 2 else "https://www.google.com"
        driver = create_new_driver()
        driver.get(url)
        time.sleep(2)
        print(json.dumps({"status": "ok", "url": url, "title": driver.title}))
        
    elif cmd == "scroll":
        driver = create_existing_driver()
        if not driver:
            print(json.dumps({"error": "No browser open. Run 'open' first."}))
            return
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 1
        for i in range(n):
            time.sleep(1.5)
            driver.execute_script('window.scrollBy(0, window.innerHeight);')
            print(f"Scrolled {i+1}/{n}")
        print(json.dumps({"status": "ok"}))

    elif cmd == "goto":
        url = sys.argv[2]
        driver = create_existing_driver()
        if not driver:
            print(json.dumps({"error": "No browser open"}))
            return
        driver.get(url)
        time.sleep(2)
        print(json.dumps({"status": "ok", "title": driver.title}))

    elif cmd == "screenshot":
        driver = create_existing_driver()
        if not driver:
            print(json.dumps({"error": "No browser open"}))
            return
        path = sys.argv[2] if len(sys.argv) > 2 else "screenshot.png"
        driver.save_screenshot(path)
        print(json.dumps({"status": "ok", "path": path}))

def create_existing_driver():
    opts = Options()
    opts.add_experimental_option("debuggerAddress", "127.0.0.1:9222")
    try:
        driver = webdriver.Chrome(options=opts)
        return driver
    except:
        return None

if __name__ == "__main__":
    main()

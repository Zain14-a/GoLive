import subprocess
import time
import json
import sys
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
DEBUG_PORT = 9222
PID_FILE = "chrome_pid.txt"

def start_chrome_with_debug(url="https://www.tiktok.com/"):
    # Kill existing
    subprocess.run(["taskkill", "/F", "/IM", "chrome.exe"], capture_output=True)
    time.sleep(2)
    
    # Start Chrome with remote debugging
    proc = subprocess.Popen([
        CHROME,
        f"--remote-debugging-port={DEBUG_PORT}",
        "--start-maximized",
        url
    ])
    
    with open(PID_FILE, "w") as f:
        f.write(str(proc.pid))
    
    print(f"Chrome started (PID: {proc.pid}), waiting...")
    time.sleep(4)
    return proc.pid

def connect():
    opts = Options()
    opts.add_experimental_option("debuggerAddress", f"127.0.0.1:{DEBUG_PORT}")
    driver = webdriver.Chrome(options=opts)
    return driver

def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "open"
    
    if action == "start":
        url = sys.argv[2] if len(sys.argv) > 2 else "https://www.tiktok.com/"
        start_chrome_with_debug(url)
        driver = connect()
        print(json.dumps({"status": "ok", "url": driver.current_url, "title": driver.title}))
        
    elif action == "connect":
        driver = connect()
        print(json.dumps({"status": "ok", "url": driver.current_url, "title": driver.title}))
    
    elif action == "goto":
        url = sys.argv[2]
        driver = connect()
        driver.get(url)
        time.sleep(2)
        print(json.dumps({"status": "ok", "url": driver.current_url, "title": driver.title}))
    
    elif action == "scroll":
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 1
        driver = connect()
        for i in range(count):
            time.sleep(2)
            driver.execute_script("window.scrollBy(0, window.innerHeight);")
            print(f"Video {i+1}/{count}")
        print(json.dumps({"status": "ok"}))
    
    elif action == "screenshot":
        driver = connect()
        path = sys.argv[2] if len(sys.argv) > 2 else "screenshot.png"
        driver.save_screenshot(path)
        print(json.dumps({"status": "ok", "path": path}))
    
    elif action == "stop":
        subprocess.run(["taskkill", "/F", "/IM", "chrome.exe"], capture_output=True)
        print(json.dumps({"status": "stopped"}))

if __name__ == "__main__":
    main()

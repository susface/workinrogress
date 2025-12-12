from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Determine the absolute path to index.html
        cwd = os.getcwd()
        file_path = f"file://{cwd}/index.html"

        print(f"Navigating to {file_path}")
        page.goto(file_path)

        # Wait for settings to load (simulated)
        page.wait_for_timeout(1000)

        # 1. Verify gradient variables are set on body
        gradient_start = page.evaluate("getComputedStyle(document.body).getPropertyValue('--gradient-start')").strip()
        gradient_end = page.evaluate("getComputedStyle(document.body).getPropertyValue('--gradient-end')").strip()
        print(f"Gradient Start: {gradient_start}")
        print(f"Gradient End: {gradient_end}")

        # 2. Open Settings modal to verify color pickers
        settings_btn = page.locator("#settings-btn")
        if settings_btn.is_visible():
            settings_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path="verification/settings_modal.png")
            print("Captured settings_modal.png")
        else:
            print("Settings button not visible")

        # 3. Verify Scanning Overlay logic (simulate showing it)
        # We can manually show it via JS to verify styles
        page.evaluate("document.getElementById('scanning-overlay').classList.remove('hidden')")
        page.wait_for_timeout(500)
        page.screenshot(path="verification/scanning_overlay.png")
        print("Captured scanning_overlay.png")

        browser.close()

if __name__ == "__main__":
    run()

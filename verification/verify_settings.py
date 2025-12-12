from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Determine the absolute path to index.html
        cwd = os.getcwd()
        index_path = os.path.join(cwd, 'index.html')
        file_url = f'file://{index_path}'

        print(f"Loading page: {file_url}")
        page.goto(file_url)

        # Wait for settings button and click it to open modal
        print("Waiting for settings button...")
        page.wait_for_selector('#settings-btn')
        page.click('#settings-btn')

        # Wait for modal to appear
        print("Waiting for settings modal...")
        page.wait_for_selector('#settings-modal.active')

        # Wait a bit for animations
        page.wait_for_timeout(1000)

        # Check if Server Status text is visible
        server_status = page.text_content('#game-count-info')
        print(f"Server Status Text: {server_status}")

        # Check if Reset button is visible
        reset_btn = page.is_visible('#reset-settings')
        print(f"Reset Button Visible: {reset_btn}")

        # Take screenshot of the settings modal
        screenshot_path = os.path.join(cwd, 'verification', 'settings_modal.png')
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to: {screenshot_path}")

        browser.close()

if __name__ == '__main__':
    run()

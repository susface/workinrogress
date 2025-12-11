import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        page = await browser.new_page()

        # Construct the file path for index.html
        # The script is in the root, and index.html is also in the root.
        file_path = "file://" + os.path.abspath('index.html')
        print(f"Navigating to: {file_path}")

        await page.goto(file_path)

        # Give the page time to load everything, especially the coverflow
        print("Waiting for page to load...")
        await page.wait_for_selector('#coverflow-container', timeout=30000)
        print("Coverflow container found.")

        # Wait a bit longer for animations and scripts to finish
        await asyncio.sleep(5)

        # Take a screenshot of the initial state
        await page.screenshot(path='screenshot_initial.png')
        print("Initial screenshot taken.")

        # Test Case 1: Settings Modal and Duplicate Game Manager
        print("\n--- Testing Settings Modal and Duplicate Game Manager ---")
        # Click the settings button
        await page.click('#settings-btn')
        print("Clicked settings button.")
        await page.wait_for_selector('#settings-modal', state='visible')
        print("Settings modal is visible.")

        # Click the "Manage Duplicates" button inside the settings modal
        await page.click('#manage-duplicates-btn')
        print("Clicked 'Manage Duplicates' button.")

        # Wait for the duplicate games panel to appear
        await page.wait_for_selector('#duplicate-game-manager', state='visible')
        print("Duplicate game manager panel is visible.")

        # Take a screenshot
        await page.screenshot(path='screenshot_duplicate_manager.png')
        print("Duplicate manager screenshot taken.")

        # Close the duplicate manager panel
        await page.click('#duplicate-game-manager .close-btn')
        print("Closed duplicate manager panel.")
        await page.wait_for_selector('#duplicate-game-manager', state='hidden')
        print("Duplicate manager panel is hidden.")

        # The settings modal should already be hidden at this point.
        # We can add a check to be sure.
        await page.wait_for_selector('#settings-modal', state='hidden')
        print("Settings modal is confirmed hidden.")

        # Test Case 2: Themes Panel
        print("\n--- Testing Themes Panel ---")
        # Click the "More Options" button
        await page.click('#more-btn')
        print("Clicked 'More Options' button.")
        await page.wait_for_selector('#more-dropdown', state='visible')
        print("More options dropdown is visible.")

        # Click the "Themes" button in the dropdown
        themes_button_selector = '#themes-btn-menu'
        await page.click(themes_button_selector)
        print("Clicked 'Themes' button in dropdown.")

        # Wait for the themes panel to appear
        # The themes modal is created dynamically, so we wait for its container
        await page.wait_for_selector('div[style*="z-index: 9999"]', state='visible')
        print("Themes panel is visible.")

        # Take a screenshot of the themes panel
        await page.screenshot(path='screenshot_themes_panel.png')
        print("Themes panel screenshot taken.")

        # Close the themes panel by clicking the close button inside it
        await page.click('div[style*="z-index: 9999"] button:text("Close")')
        print("Closed themes panel.")

        await asyncio.sleep(1) # Give it a moment to disappear

        print("\n--- All tests passed! ---")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())

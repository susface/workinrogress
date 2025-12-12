from playwright.sync_api import sync_playwright
import time
import os

def test_visualizers():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the test file
        file_path = f"file://{os.path.abspath('verification/visualizer_test.html')}"
        page.goto(file_path)

        modes = ['bars', 'oscilloscope', 'waveform', 'circle', 'trippy', 'particles', 'starfield']

        for mode in modes:
            print(f"Testing mode: {mode}")
            # Set mode via JS
            page.evaluate(f"window.setMode('{mode}')")
            # Wait for a few frames
            page.wait_for_timeout(500)
            # Take screenshot
            page.screenshot(path=f"verification/viz_{mode}.png")
            print(f"Captured verification/viz_{mode}.png")

        browser.close()

if __name__ == "__main__":
    test_visualizers()

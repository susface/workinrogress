from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 720})

        # Load the index.html file directly
        file_path = os.path.abspath("index.html")
        page.goto(f"file://{file_path}")

        # 1. Verify Window Controls are present
        print("Checking Window Controls...")
        window_controls = page.locator("#window-controls")

        # Check if visible (might depend on Electron API simulation, but they should be in DOM)
        # In our script logic:
        # if (!window.electronAPI) { const windowControls = ...; windowControls.classList.add('hidden'); }
        # So they might be hidden because window.electronAPI is undefined in Playwright

        # However, we can check if they are in the correct place in DOM structure
        # Window controls should be a direct child of #top-bar (which we placed it in)
        # Wait, I placed it as a child of top-bar? No, let's check index.html again.

        # In index.html:
        # <div id="top-bar"> ... <div id="window-controls">...</div> </div>
        # Yes, direct child.

        # But wait, in style.css I set it to position: fixed.

        # Let's verify the style
        box = window_controls.bounding_box()
        # Even if hidden, we can check computed style if we unhide it or check via JS

        # Force show window controls for verification
        page.evaluate("""
            const wc = document.getElementById('window-controls');
            if(wc) {
                wc.classList.remove('hidden');
                wc.style.display = 'flex';
                wc.style.visibility = 'visible';
                wc.style.opacity = '1';
            }
        """)

        page.wait_for_selector("#window-controls", state="visible")

        # Check computed style
        position = page.evaluate("window.getComputedStyle(document.getElementById('window-controls')).position")
        print(f"Window Controls Position: {position}")
        if position != "fixed":
            print("ERROR: Window controls should be fixed position")

        top = page.evaluate("window.getComputedStyle(document.getElementById('window-controls')).top")
        right = page.evaluate("window.getComputedStyle(document.getElementById('window-controls')).right")
        print(f"Top: {top}, Right: {right}")

        # 2. Verify Visualizer Options
        print("Checking Visualizer Options...")
        page.click("#settings-btn")
        page.wait_for_selector("#settings-modal.active")

        # Check the select options
        options = page.locator("#visualizer-mode option").all_inner_texts()
        print("Visualizer Options found:", options)

        expected_options = ["DNA Helix", "Matrix Rain", "Fireworks", "Neon Tunnel"]
        for opt in expected_options:
            if opt in options:
                print(f"Confirmed option: {opt}")
            else:
                print(f"MISSING option: {opt}")

        # Take screenshot of settings with visualizer options
        # Scroll to visualizer options
        page.locator("#visualizer-mode").scroll_into_view_if_needed()
        page.screenshot(path="verification/verification_visualizer.png")
        print("Screenshot saved to verification/verification_visualizer.png")

        # Close settings
        page.click(".close-btn")

        # Take screenshot of main window to see window controls (top right)
        page.screenshot(path="verification/verification_main.png")
        print("Screenshot saved to verification/verification_main.png")

        browser.close()

if __name__ == "__main__":
    os.makedirs("verification", exist_ok=True)
    run()

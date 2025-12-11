from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the index.html file directly
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/index.html")

        # Wait for the unified mod manager to be present (simulating opening it)
        # Since we can't easily trigger the full app state without Electron,
        # we will manually verify the DOM structure by injecting the mod manager script
        # and initializing it with mock data.

        page.evaluate("""
            const manager = new UnifiedModManager();
            manager.createModManagerUI();

            // Mock the game object
            const mockGame = {
                id: 1,
                title: 'Test Unity Game',
                engine: 'Unity',
                install_path: '/path/to/game'
            };

            // Mock Electron API
            window.electronAPI = {
                checkModLoaderStatus: async (gameId, loader) => {
                    return {
                        success: true,
                        isInstalled: false,
                        message: 'Not installed'
                    };
                },
                installBepInEx: async () => { return { success: true }; },
                installMelonLoader: async () => { return { success: true }; },
                searchThunderstoreMods: async () => { return { success: true, mods: [] }; },
                getGameMods: async () => { return { success: true, mods: [] }; }
            };

            manager.showModManager(mockGame);
            manager.updateModSupportInfo();
        """)

        page.wait_for_selector('#unified-mod-manager.active')

        # Take a screenshot of the Mod Manager with the install buttons
        page.screenshot(path="verification/mod_manager_install_buttons.png")

        browser.close()

if __name__ == "__main__":
    run()

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(__dirname, '..', 'verification_screenshot.png');

(async () => {
    console.log('Launching browser...');
    try {
        const browser = await chromium.launch();
        const page = await browser.newPage();
        console.log('Navigating to http://localhost:5174/barber...');
        await page.goto('http://localhost:5174/barber');

        // Wait for the "Shop Operations" header or similar element
        try {
            await page.waitForSelector('h1:has-text("Shop Operations")', { timeout: 5000 });
        } catch (e) {
            console.log('Timeout waiting for selector, taking screenshot anyway...');
        }

        console.log('Taking screenshot...');
        await page.screenshot({ path: outputPath, fullPage: true });
        console.log(`Screenshot saved to ${outputPath}`);
        await browser.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();

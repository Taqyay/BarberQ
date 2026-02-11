import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
        await page.goto('http://localhost:5173/dashboard');
        await page.waitForTimeout(5000); // Wait for render
        const text = await page.textContent('body');
        const version = 'v0.8.2_100226_1';

        if (text.includes(version)) {
            console.log(`SUCCESS: Found version ${version}`);
        } else {
            console.error(`FAILURE: Version ${version} not found!`);
            const bodyText = await page.innerText('body');
            fs.writeFileSync('verification-dump.txt', bodyText);
            console.log('Dumped body text to verification-dump.txt');

            // Check for blank screen?
            if (text.trim().length === 0) {
                console.error('FAILURE: Page appears blank.');
            }
        }

        await page.screenshot({ path: 'dashboard-verification.png' });
        console.log('Snapshot saved to dashboard-verification.png');

    } catch (error) {
        console.error('Error during verification:', error);
    } finally {
        await browser.close();
    }
})();

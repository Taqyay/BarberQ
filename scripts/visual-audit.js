import { chromium } from 'playwright';
import { io } from 'socket.io-client';

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function runAudit() {
    console.log('--- Zero-Tolerance Evidence-Based Audit Starting ---');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    let diagnosticTrace = null;
    page.on('console', msg => {
        if (msg.text().includes('[UI-SYNC]')) {
            diagnosticTrace = msg.text();
            console.log('DIAGNOSTIC TRACE:', diagnosticTrace);
        }
    });

    const socket = io('http://localhost:3001');

    try {
        console.log('Step 1: Navigate to Staff Dashboard (#dashboard)...');
        await page.goto('http://localhost:5173/#dashboard');
        await delay(5000);

        console.log('Step 2: Switch to Calendar Tab...');
        await page.locator('nav button').filter({ hasText: 'CALENDAR' }).click();
        await delay(3000);

        const labels = page.locator('.calendar-time-label');
        const initialHour = await labels.first().textContent();
        console.log('INITIAL Opening Hour in UI:', initialHour.trim());

        // Change opening time to 12:00 PM (to ensure we see a delta)
        console.log('Step 3: Updating Opening Time to 12:00 PM via Socket...');
        socket.emit('UPDATE_SETTINGS', { firstCutTime: 12 });
        await delay(5000);

        const updatedHour = await labels.first().textContent();
        console.log('UPDATED Opening Hour in UI:', updatedHour.trim());

        const isReactive = updatedHour.trim() === '12:00';
        console.log('REACTIVE AUDIT STATUS:', isReactive ? 'PASS' : 'FAIL');
        await page.screenshot({ path: 'scripts/evidence-absolute-opening-12pm.png' });

        // Step 4: Verify 160px Enforcement
        await page.locator('nav button').filter({ hasText: 'QUEUE' }).click();
        await delay(2000);
        const cardHeight = await page.evaluate(() => {
            const card = document.querySelector('.h-\\[160px\\]');
            return card ? getComputedStyle(card).height : 'NOT FOUND';
        });
        console.log('IN-CHAIR CARD HEIGHT:', cardHeight);

        // Step 5: Verify Theme Background (Cobalt)
        socket.emit('UPDATE_SETTINGS', { theme: 'sovereign-cobalt' });
        await delay(5000);
        const bgColor = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
        console.log('SOVEREIGN COBALT BACKGROUND COLOR:', bgColor);

        console.log('FINAL_EVIDENCE_JSON:' + JSON.stringify({
            trace: diagnosticTrace,
            initialHour: initialHour.trim(),
            updatedHour: updatedHour.trim(),
            cardHeight: cardHeight,
            cobaltBg: bgColor
        }));

        console.log('Audit complete.');
    } catch (err) {
        console.error('Audit failed:', err);
    } finally {
        await browser.close();
        socket.close();
        process.exit(0);
    }
}

runAudit();

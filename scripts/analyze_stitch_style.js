import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const url = 'https://stitch.withgoogle.com/preview/16616031670918839445?node-id=299fc3dd51e74d3d807b7af2c5de58aa';

    console.log(`Navigating to ${url}...`);
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        console.log('Page loaded. Waiting 10s for rendering...');
        await page.waitForTimeout(10000);

        // Screenshot for artifact reference
        await page.screenshot({ path: 'stitch_reference.png', fullPage: true });
        console.log('Screenshot saved to stitch_reference.png');

        // Extract style tokens
        const styles = await page.evaluate(() => {
            const colors = {};
            const bgColors = {};
            const fonts = {};
            const radii = {};

            const elements = document.querySelectorAll('*');
            elements.forEach(el => {
                const style = window.getComputedStyle(el);

                // Text Color
                if (style.color && style.color !== 'rgba(0, 0, 0, 0)' && style.display !== 'none') {
                    colors[style.color] = (colors[style.color] || 0) + 1;
                }

                // Background Color
                if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.display !== 'none') {
                    bgColors[style.backgroundColor] = (bgColors[style.backgroundColor] || 0) + 1;
                }

                // Font Family
                if (style.fontFamily) {
                    fonts[style.fontFamily] = (fonts[style.fontFamily] || 0) + 1;
                }

                // Border Radius
                if (style.borderRadius && style.borderRadius !== '0px') {
                    radii[style.borderRadius] = (radii[style.borderRadius] || 0) + 1;
                }
            });

            const sortObj = (obj) => Object.entries(obj)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

            return {
                textColors: sortObj(colors),
                backgroundColors: sortObj(bgColors),
                fontFamilies: sortObj(fonts),
                borderRadii: sortObj(radii)
            };
        });

        console.log('Style Analysis:', JSON.stringify(styles, null, 2));
        fs.writeFileSync('stitch_style_data.json', JSON.stringify(styles, null, 2));

    } catch (error) {
        console.error('Error analyzing style:', error);
    } finally {
        await browser.close();
    }
})();

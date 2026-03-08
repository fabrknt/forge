#!/usr/bin/env node

/**
 * FABRKNT Demo Video Recording Script
 * Captures scroll and button clicks visibly for demo purposes.
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const useProd = args.includes('--prod');
const noRecord = args.includes('--no-record');
const customUrl = args.find(arg => arg.startsWith('--url='))?.split('=')[1];

const config = {
    url: customUrl || (useProd ? 'https://fabrknt.com' : 'http://localhost:3000'),
    width: 1280,
    height: 720,
    outputDir: path.join(__dirname, 'output'),
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
}

// Click button with visible cursor movement
async function clickButton(page, text) {
    // First, scroll the button into view
    const scrolled = await page.evaluate((searchText) => {
        const buttons = [...document.querySelectorAll('button')];
        const btn = buttons.find(b => {
            const btnText = b.textContent?.trim() || '';
            return btnText.includes(searchText);
        });
        if (btn) {
            btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return true;
        }
        return false;
    }, text);

    if (!scrolled) {
        console.log(`⚠️ Button not found: "${text}"`);
        return false;
    }

    // Wait for scroll animation
    await wait(600);

    // Now get the button position AFTER scroll
    const pos = await page.evaluate((searchText) => {
        const buttons = [...document.querySelectorAll('button')];
        const btn = buttons.find(b => {
            const btnText = b.textContent?.trim() || '';
            return btnText.includes(searchText);
        });
        if (btn) {
            const rect = btn.getBoundingClientRect();
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        }
        return null;
    }, text);

    if (!pos) {
        console.log(`⚠️ Could not get position for: "${text}"`);
        return false;
    }

    // Move cursor to button visibly
    await page.mouse.move(pos.x, pos.y, { steps: 15 });
    await wait(400);

    // Click
    await page.mouse.click(pos.x, pos.y);
    await wait(200);

    return true;
}

// Smooth scroll
async function smoothScroll(page, distance) {
    const steps = 8;
    const stepDistance = distance / steps;
    for (let i = 0; i < steps; i++) {
        await page.evaluate((d) => window.scrollBy(0, d), stepDistance);
        await wait(60);
    }
    await wait(400);
}

async function recordDemo() {
    console.log('🎬 Starting FABRKNT Demo Recording');
    console.log(`📍 URL: ${config.url}`);

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            `--window-size=${config.width},${config.height + 80}`,
            '--no-first-run',
            '--no-default-browser-check',
        ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: config.width, height: config.height });

    let recorder = null;
    let videoPath = null;

    if (!noRecord) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        videoPath = path.join(config.outputDir, `demo-${timestamp}.webm`);
        recorder = await page.screencast({ path: videoPath, format: 'webm' });
        console.log('🔴 Recording...');
    }

    try {
        // === SECTION 1: LOAD HOMEPAGE ===
        console.log('📹 Loading homepage...');
        await page.goto(config.url, { waitUntil: 'networkidle2', timeout: 30000 });
        await wait(2500);

        // === SECTION 2: QUICKSTART - TRY ===
        console.log('📹 QuickStart flow...');

        // Click on amount input
        const input = await page.$('input[type="number"]');
        if (input) {
            const inputBox = await input.boundingBox();
            if (inputBox) {
                await page.mouse.move(inputBox.x + inputBox.width / 2, inputBox.y + inputBox.height / 2, { steps: 12 });
                await wait(300);
                await input.click({ clickCount: 3 });
                await wait(200);
                await input.type('10000', { delay: 80 });
                await wait(800);
            }
        }

        // Click $10K preset
        console.log('   Clicking $10K preset...');
        await clickButton(page, '$10K');
        await wait(600);

        // Select Balanced risk
        console.log('   Selecting Balanced risk...');
        await clickButton(page, 'Balanced');
        await wait(1000);

        // Scroll to show button
        await smoothScroll(page, 120);
        await wait(400);

        // Click Show My Allocation
        console.log('   Clicking Show My Allocation...');
        await clickButton(page, 'Show My Allocation');
        await wait(3500);

        // Scroll to see results
        await smoothScroll(page, 300);
        await wait(1800);

        // === SECTION 3: INSIGHTS TAB ===
        console.log('📹 Insights tab...');
        await clickButton(page, 'Insights');
        await wait(2200);

        await smoothScroll(page, 250);
        await wait(1200);

        await smoothScroll(page, 200);
        await wait(1800);

        // === SECTION 4: EXPLORE TAB ===
        console.log('📹 Explore tab...');
        await clickButton(page, 'Explore');
        await wait(2200);

        await smoothScroll(page, 350);
        await wait(1200);

        await smoothScroll(page, 250);
        await wait(1800);

        // === SECTION 5: PRACTICE TAB ===
        console.log('📹 Practice tab...');
        await clickButton(page, 'Practice');
        await wait(2200);

        await smoothScroll(page, 280);
        await wait(1800);

        // === SECTION 6: COMPARE TAB ===
        console.log('📹 Compare tab...');
        await clickButton(page, 'Compare');
        await wait(2200);

        await smoothScroll(page, 300);
        await wait(1200);

        await smoothScroll(page, 250);
        await wait(1800);

        // === SECTION 7: BACK TO START ===
        console.log('📹 Closing...');
        await clickButton(page, 'Get Started');
        await wait(1200);

        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
        await wait(2200);

        console.log('✅ Done');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (recorder) {
            await recorder.stop();
            console.log(`💾 Saved: ${videoPath}`);
        }
        await wait(800);
        await browser.close();
    }
}

recordDemo().catch(console.error);

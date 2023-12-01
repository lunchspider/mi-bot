import { GoogleSpreadsheetRow } from "google-spreadsheet";
import { Page } from "puppeteer";

export async function login(page: Page, record: GoogleSpreadsheetRow) {
    await page.goto('https://store.mi.com/in/site/login');
    await page.waitForSelector('input[name = "account"]', { visible: true });
    await page.type('input[name = "account"]', record.get('USERNAME'));
    await page.type('input[type = "password"]', record.get('PASSWORD'));
    await page.click('button[type = "submit"]');
    await page.waitForNavigation();
    // skips the add email popup if it appears
    if (page.url().includes('account')) {
        await page.waitForSelector('.mi-layout__container span', { visible: true });
        await page.click('.mi-layout__container span');
        await page.waitForNavigation();
    }
}

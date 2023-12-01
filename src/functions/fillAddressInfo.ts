import { GoogleSpreadsheetRow } from "google-spreadsheet";
import { Page } from "puppeteer";

export async function fillAddressInfo(page: Page, record: GoogleSpreadsheetRow) {
    await page.type('input[maxlength = "30"]', record.get("NAME"));
    await page.type('input[maxlength = "6"]', record.get('PINCODE'));
    await new Promise((r) => setTimeout(r, 3000));
    await page.type('input[maxlength = "10"]', record.get('PHONE'));
    await page.type('input[maxlength = "150"]', record.get('ADDRESS'));
    await page.type('input[maxlength = "50"]', record.get('ADDRESSEMAIL'));
    await page.click('.mi-address-checkbox__item > div');
    await page.click('.address-save');
}


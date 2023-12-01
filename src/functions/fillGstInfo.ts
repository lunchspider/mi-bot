import { GoogleSpreadsheetRow } from "google-spreadsheet";
import { Page } from "puppeteer";

export async function fillGstInfo(page: Page, record: GoogleSpreadsheetRow) {
    await page.waitForSelector('.invoice-check-text', { visible: true });
    await page.click('.invoice-check-text');
    let isBillingAddress = await page.evaluate(() => {
        return !!document.querySelector('div.checkout-invoice__invoice span[role = "button"]');
    });
    console.log(isBillingAddress);
    if (isBillingAddress) {
        await page.click('div.checkout-invoice__invoice span[role = "button"]');
    }
    await page.waitForSelector('div[aria-label = "Modal"]', { visible: true });
    const data = {
        name: record.get("NAME"),
        pincode: record.get("PINCODE"),
        phone: record.get("PHONE"),
        address: record.get("ADDRESS"),
        email: record.get("EMAIL"),
    };
    await page.evaluate(() => {
        document.querySelector<HTMLInputElement>('div[aria-label = "Modal"] main input[maxlength = "30"]')!.value = '';
        document.querySelector<HTMLInputElement>('div[aria-label = "Modal"] main input[maxlength = "6"]')!.value = '';
        document.querySelector<HTMLInputElement>('div[aria-label = "Modal"] main input[maxlength = "10"]')!.value = '';
        document.querySelector<HTMLInputElement>('div[aria-label = "Modal"] main input[maxlength = "150"]')!.value = '';
        document.querySelector<HTMLInputElement>('div[aria-label = "Modal"] main input[maxlength = "50"]')!.value = '';
    })
    await page.type('div[aria-label = "Modal"] main input[maxlength = "30"]', data.name);
    await page.type('div[aria-label = "Modal"] main input[maxlength = "6"]', data.pincode);
    await new Promise((r) => setTimeout(r, 3000));
    await page.type('div[aria-label = "Modal"] main input[maxlength = "10"]', data.phone);
    await page.type('div[aria-label = "Modal"] main input[maxlength = "150"]', data.address);
    await page.type('div[aria-label = "Modal"] main input[maxlength = "50"]', data.email);

    await page.click('div[aria-label = "Modal"] footer button');
    await page.waitForSelector('div.gstin-code input', { visible: true });
    let gst = record.get('GST') as string;
    gst = gst.substring(2);
    await page.type('div.gstin-code input', gst);
    await new Promise((r) => setTimeout(r, 3000));
    page.evaluate(() => {
        let element = document.querySelector('.gstin-wrap__choose.gstin-choose');
        if (element) {
            document.querySelector<HTMLButtonElement>('.gstin-choose__btn--wrap > button')?.click();
            document.querySelectorAll('.gstin-choose__btn--wrap')[1].querySelector('button')?.click();
        }
    })
}


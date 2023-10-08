import puppeteer, { Page } from "puppeteer";
import { spreadSheet } from "./spreadsheet.js";
import readline from 'readline/promises';
import { GoogleSpreadsheetRow } from "google-spreadsheet";

async function wait() {
    let r = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    await r.question('waiting!!');
    r.close();
}

async function login(page: Page, record: GoogleSpreadsheetRow) {
    await page.goto('https://store.mi.com/in/site/login');
    await page.waitForSelector('input[name = "account"]', { visible: true });
    await page.type('input[name = "account"]', record.get('EMAIL'));
    await page.type('input[type = "password"]', record.get('PASSWORD'));
    await page.click('button[type = "submit"]');
}


async function order(page: Page, record: GoogleSpreadsheetRow) {
    await login(page, record);
    await page.goto(record.get("LINK"));
    await page.waitForSelector("#nav-buy_now");
    await page.click("#nav-buy_now");
    let price = await page.evaluate(() => {
        return parseInt(document
            .querySelector<HTMLSpanElement>('div[class = "information-section__product-price"] > strong')!
            .innerText
            .substr(1)
            .split(',')
            .join(''));
    });
    if (parseInt(record.get('MAX PRICE')) < price) {
        record.set('ERROR', 'max price is is less than the item price : ' + price);
        return;
    }
    await page.click('button[aria-label="Buy Now"]');
    await page.waitForNavigation();
    await page.click('button[aria-label="Check Out"]')
    await page.waitForNavigation();
    await page.click('.address-content > div > div > div:nth-child(3) > span');
    await page.waitForSelector('div[aria-label="Modal"] > footer > button:nth-child(2)');
    await page.click('div[aria-label="Modal"] > footer > button:nth-child(2)');
}

async function main() {
    await spreadSheet.loadInfo()
    const records = await spreadSheet.sheetsByIndex[0].getRows()
    console.log(records);

    const browser = await puppeteer.launch({ headless: false, executablePath: '/opt/brave.com/brave/brave', args: ['--disable-notifications'] });
    const page = await browser.newPage();
    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        await order(page, record);
    }
    await browser.close();
}

main();

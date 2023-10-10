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
    await page.waitForNavigation();
}

async function fillAddressInfo(page: Page, record: GoogleSpreadsheetRow) {
    await page.type('input[maxlength = "30"]', record.get("NAME"));
    await page.type('input[maxlength = "6"]', record.get('PINCODE'));
    await new Promise((r) => setTimeout(r, 3000));
    await page.type('input[maxlength = "10"]', record.get('PHONE'));
    await page.type('input[maxlength = "150"]', record.get('ADDRESS'));
    await page.type('input[maxlength = "50"]', record.get('ADDRESSEMAIL'));
    await page.click('.mi-address-checkbox__item > div');
    await page.click('.address-save');
}

async function fillCardInfo(page: Page, record: GoogleSpreadsheetRow) {
    await page.waitForSelector('#jusPayIframe > iframe', { visible: true });
    await new Promise((r) => setTimeout(r, 4000));
    const elementHanlde = await page.$('#jusPayIframe > iframe');
    const frame = await elementHanlde?.contentFrame()!;
    await frame.type('input[placeholder = "Enter Card Number"]', record.get('CARD'));
    await frame.type('input[placeholder = "MM/YY"]', record.get('EXP'));
    await frame.type('input[placeholder = "CVV"]', record.get('CVV'));
    await new Promise((r) => setTimeout(r, 1000));
    await frame.click('div[testid = "btn_pay"] > div article');
    await new Promise((r) => setTimeout(r, 1000));
    await frame.evaluate(() => {
        let el = document.querySelector('div[testid = "pop_tokenization"] div div:nth-child(2) div div:nth-child(3) div div:nth-child(2)');
        if (el) {
            //@ts-ignore
            el.click();
        }
    });
    await page.waitForNavigation();
}

async function clearCart(page: Page) {
    await page.goto('https://store.mi.com/in/cart/');
    await page.waitForSelector('.cart__main', { visible: true });
    await new Promise((r) => setTimeout(r, 1000));
    let deleteButtons = await page.$('button.cart-item__delete');
    while (deleteButtons !== null) {
        await deleteButtons.click();
        await page.waitForSelector('div[aria-label = "Modal"] footer div:nth-child(2)');
        await page.click('div[aria-label = "Modal"] footer div:nth-child(2)');
        await new Promise((r) => setTimeout(r, 1000));
        deleteButtons = await page.$('button.cart-item__delete');
    }
}

async function fillGstInfo(page: Page, record: GoogleSpreadsheetRow) {
    await page.waitForSelector('.invoice-check-text', { visible: true });
    await page.click('.invoice-check-text');
    let isBillingAddress = await page.evaluate(() => {
        return !!document.querySelector('div.checkout-invoice__invoice span[role = "button"]');
    });
    console.log(isBillingAddress);
    if (isBillingAddress) {
        await page.click('div.checkout-invoice__invoice span[role = "button"]');
    }
    await page.waitForSelector('div[aria-label = "Modal"]');
    const data = {
        name: record.get("NAME"),
        pincode: record.get("PINCODE"),
        phone: record.get("PHONE"),
        address: record.get("ADDRESS"),
        email: record.get("EMAIL"),
    };
    await page.evaluate((data) => {
        document.querySelector<HTMLInputElement>('div[aria-label = "Modal"] main input[maxlength = "30"]')!.value = data.name;
        document.querySelector<HTMLInputElement>('div[aria-label = "Modal"] main input[maxlength = "6"]')!.value = data.pincode;
    }, data)
    await new Promise((r) => setTimeout(r, 3000));

    await page.evaluate((data) => {
        document.querySelector<HTMLInputElement>('div[aria-label = "Modal"] main input[maxlength = "10"]')!.value = data.phone;
        document.querySelector<HTMLInputElement>('div[aria-label = "Modal"] main input[maxlength = "150"]')!.value = data.address;
        document.querySelector<HTMLInputElement>('div[aria-label = "Modal"] main input[maxlength = "50"]')!.value = data.email;
    }, data);
    await page.click('div[aria-label = "Modal"] footer button');
    await page.waitForSelector('div.gstin-code input');
    let gst = record.get('GST') as string;
    gst = gst.substring(2);
    await page.type('div.gstin-code input', gst);
    await new Promise((r) => setTimeout(r, 3000));
}


async function order(page: Page, record: GoogleSpreadsheetRow) {
    await login(page, record);
    await clearCart(page);
    await page.goto(record.get("LINK"));
    await page.waitForSelector('div[class = "information-section__product-price"] > strong');
    let price = await page.evaluate(() => {
        return parseInt(document
            .querySelector<HTMLSpanElement>('div[class = "information-section__product-price"] > strong')!
            .innerText
            .substr(1)
            .split(',')
            .join(''));
    });
    if (parseInt(record.get('MAX PRICE')) < price) {
        throw 'max price is is less than the item price : ' + price;
    }
    let inStock = await page.evaluate(() => {
        let element = document.querySelector('button[aria-label = "Notify Me"]');
        if (element) {
            return true;
        }
        return false;
    });
    if (inStock) {
        throw 'item not in stock!';
    }
    await page.waitForSelector('button[aria-label="Buy Now"]', { visible: true });
    await page.click('button[aria-label="Buy Now"]');
    await new Promise((r) => setTimeout(r, 5000));
    let error = await page.evaluate(() => {
        let element = document.querySelector('div[aria-label = "AlertModal"] > main > span');
        if (element) {
            return element.innerHTML;
        }
    });
    console.log({ error });
    if (error) {
        throw error;
    }
    await page.waitForSelector('button[aria-label = "Check Out"]');
    await page.click('button[aria-label = "Check Out"]');
    await new Promise((r) => setTimeout(r, 3000));
    // check if there is already a address present!
    const isAddressThere = await page.evaluate(() => {
        return !document.querySelector('.address-content > section[class = "empty-address"]');
    });
    if (isAddressThere) {
        await page.click('.address-content > div > div > div:nth-child(3) > span');
        await page.waitForSelector('div[aria-label="Modal"] > footer > button:nth-child(2)');
        await page.click('div[aria-label="Modal"] > footer > button:nth-child(2)');
    }
    await fillAddressInfo(page, record);
    await fillGstInfo(page, record);
    await page.waitForSelector('.juspay-prompt-content', { visible: true });
    await page.click('.order-summary > div > button');
    await fillCardInfo(page, record);
}

async function main() {
    await spreadSheet.loadInfo()
    const records = await spreadSheet.sheetsByIndex[0].getRows()
    console.log(records);

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        if (record.get('ATTEMPTED') === 'Y') {
            continue;
        }
        record.set('ATTEMPTED', 'Y');
        const browser = await puppeteer.launch({ headless: false, args: ['--disable-notifications'] });
        const page = await browser.newPage();
        try {
            await order(page, record);
        } catch (e: any) {
            console.log(e);
            record.set('ERROR', e.toString());
        }
        await record.save();
        await browser.close();
    }
}

main();

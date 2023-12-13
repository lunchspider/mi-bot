import { login } from "./login.js";
import { clearCart } from "./clearCart.js";
import { handleOrderInfo } from "./handleOrderInfo.js";
import { fillCardInfo } from "./fillCardInfo.js";
import { fillAddressInfo } from "./fillAddressInfo.js";
import { fillGstInfo } from "./fillGstInfo.js";
import { GoogleSpreadsheetRow } from "google-spreadsheet";
import { Page } from "puppeteer";
import { wait } from "./wait.js";

export async function order(page: Page, record: GoogleSpreadsheetRow) {
    try {
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
        const name = await page.evaluate(() => {
            let name = document.querySelector('.information-section__product-title > span')?.innerHTML ?? '';
            let info = document.querySelector('.information-section__product-info > div')?.innerHTML ?? '';
            return name + ' ' + info;
        });
        console.log(name);
        record.set('ITEM NAME', name ?? '');
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
        await new Promise((r) => setTimeout(r, 2000));
        const elementHandle = await page.$('iframe');
        if (elementHandle) {
            await page.evaluate(() => {
                let iframe = document.querySelector('iframe');
                if (iframe && iframe.contentDocument) {
                    let button = iframe.contentDocument.querySelector('button');
                    if (button) {
                        button.click();
                    }
                }
            });
        }
        await page.waitForSelector('button[aria-label="Buy Now"]', { visible: true });
        await new Promise((r) => setTimeout(r, 2000));
        let qty = parseInt(record.get('order quantity') ?? '1');
        for (let i = 1; i < qty; i++) {
            await page.click('button[aria-label = "Increase the quantity"]');
            await new Promise((r) => setTimeout(r, 1000));
        }
        await page.click('button[aria-label="Buy Now"]');
        await new Promise((r) => setTimeout(r, 1000));
        await page.evaluate(() => {
            let el = document.querySelector<HTMLButtonElement>('button[aria-label="Buy Now"]');
            if (el) {
                el.click();
            }
        });
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
        let q = await page.$eval('input.quantity-section__value', (e) => parseInt(e.value));
        if (qty != q) {
            throw `cart quantity is ${q} but required quantity is ${qty}`
        }
        const pricePerItem = parseInt(record.get("MAX PRICE")) / parseInt(record.get('order quantity') ?? '1');
        const totalPrice =
            await page.evaluate(() => {
                return parseInt(document
                    .querySelector('.cart__footer-total > strong')!
                    .textContent!
                    .split(' ')[1]
                    .replace('₹', '')
                    .replaceAll(',', ''));
            });
        if (pricePerItem < totalPrice / q) {
            throw `pricePerItem in spreadsheet : ${pricePerItem}, price in website : ${totalPrice / q}`
        }
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
        try {
            await page.waitForNavigation({ timeout: 1000 });
        } catch (e: any) {
            error = await page.evaluate(() => {
                let element = document.querySelector('div[aria-label = "Modal"] > main ');
                if (element) {
                    return element.innerHTML;
                }
            });
            console.log({ error });
            if (error) {
                throw error;
            }
        }
        await fillCardInfo(page, record);
        await handleOrderInfo(page, record);
    } catch (e: any) {
        console.log(e);
        record.set('ITEM NAME', '');
        record.set('ERROR', e.toString());
    }
}

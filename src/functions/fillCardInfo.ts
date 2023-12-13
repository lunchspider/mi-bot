import { GoogleSpreadsheetRow } from "google-spreadsheet";
import { Page } from "puppeteer";

export async function fillCardInfo(page: Page, record: GoogleSpreadsheetRow) {
    await page.waitForSelector('#jusPayIframe > iframe', { visible: true });
    let finalPrice = await page.evaluate(() => {
        return parseInt(document
            .querySelector('.card-order-detail > table > tbody > tr:nth-child(3) > td:nth-child(2)')?.innerHTML
            .split('₹')[1]
            .replace(',', '') ?? '');
    });
    if (parseInt(record.get("FINAL PRICE")) < finalPrice) {
        throw 'product final price is higher than value';
    }
    await new Promise((r) => setTimeout(r, 4000));
    const elementHanlde = await page.$('#jusPayIframe > iframe');
    const frame = await elementHanlde?.contentFrame()!;
    await frame.type('input[placeholder = "Enter Card Number"]', record.get('CARD'));
    let expMonth: string = record.get('EXP MONTH');
    let expYear: string = record.get('EXP YEAR');
    if (expMonth.length == 1) {
        expMonth = `0${expMonth}`;
    }
    let exp: string = `${expMonth}/${expYear}`;
    await frame.type('input[placeholder = "MM/YY"]', exp);
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
    console.log('we are here!');
    await page.waitForNavigation();
    // need either hdfc or icici
    await page.waitForFunction(() => {
        return !!document.querySelector('.input-set-cut > input')
            || !!document.querySelector('#authPasswordSet2');
    });
    let res = await page.evaluate(() => {
        return !!document.querySelector('.input-set-cut > input');
    })
    if (res) {
        // we got icic
        console.log('icici');
        page.type('input', record.get('CARDPASSWORD'));
        page.click('button');
    } else {
        console.log('hdfc');
        // we got hdfc
        await new Promise((r) => setTimeout(r, 1000));
        await page.evaluate(() => {
            //@ts-ignore
            document.querySelectorAll('a')[1].click()
        });
        await page.waitForSelector('#staticPassword');
        await page.type('#staticPassword', record.get("CARDPASSWORD"));
        await page.click('#submitBtn2');
    }
}


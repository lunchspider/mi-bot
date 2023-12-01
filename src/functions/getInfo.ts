import { login } from "./login.js";
import { GoogleSpreadsheetRow } from "google-spreadsheet";
import { Page } from "puppeteer";
import path from 'node:path';
import fs from 'fs/promises';
import { fileURLToPath } from "node:url";


export async function getInfo(
    page: Page,
    record: GoogleSpreadsheetRow,
    results: Array<any>,
    numberOfDays: number) {
    await login(page, record);
    await page.goto('https://store.mi.com/in/user/order');

    await page.waitForSelector('.user-order-list-container', { visible: true });


    let tillDate = new Date();
    tillDate.setHours(0, 0);
    tillDate.setDate(tillDate.getDate() - numberOfDays);

    const orders = await page.$$('.order-list > section > li');

    let result = [];
    const email = record.get('EMAIL') ?? '';

    for (const order of orders) {
        let time = await order.$eval('.info-left_time', x => x.textContent)
            .then((t) => {
                let dateParts = t?.split(' ')[0].split('/').map(l => +l) ?? [];
                return new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);
            });
        if (time < tillDate) {
            continue;
        }
        const status = (await order.$eval('.order-item-header--title', x => x.textContent))!;
        const id = (await order.$eval('.order-id-num', x => x.textContent))!;
        const name = (await order.$eval('.goods-list-gooods-info__wrap > div > div', x => x.textContent))!;
        const qty = (await order.$eval('.goods-list-gooods-info__wrap > div > div:nth-child(2)', x => x.textContent))!
            .split('x')
            .map((x) => x.trim())[1];

        const price = (await order.$eval('strong', x => x.textContent))!
            .replace('₹', '')
            .replace(',', '');
        result.push({ status, id, name, qty, price, email });
    }
    record.set('ORDER FETCHED', result.length ?? 0);
    const invoiceDirPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../invoice");
    try {
        await fs.access(invoiceDirPath);
    } catch (e: any) {
        await fs.mkdir(invoiceDirPath);
    }

    for (const order of result) {
        const url = `https://store.mi.com/in/user/invoice/${order.id}01`;
        const options = {
            headers: {},
            encoding: null,
            method: 'GET',
            uri: url,
        };
        /* add the cookies */
        const cookies = await page.cookies();
        //@ts-ignore
        options.headers['Cookie'] = cookies.map(ck => ck.name + '=' + ck.value).join(';');
        const response = await fetch(url, options);
        const pdfBuffer = await response.arrayBuffer();
        const binaryPdf = Buffer.from(pdfBuffer);
        await fs.writeFile(path.join(invoiceDirPath, `${order.id}.pdf`), binaryPdf, 'binary');
        results.push(order);
    }
    console.log('account processed!');
}

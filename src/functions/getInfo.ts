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

    let result = [];
    let currentPage = 1;
    while (true) {
        await page.waitForSelector('.order-list > section > li', { visible: true });
        const orders = await page.$$('.order-list > section > li');
        const username = record.get('USERNAME') ?? '';
        let shouldBreak = false;
        for (const order of orders) {
            let time = await order.$eval('.info-left_time', x => x.textContent)
                .then((t) => {
                    let dateParts = t?.split(' ')[0].split('/').map(l => +l) ?? [];
                    return new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);
                });
            if (time < tillDate) {
                shouldBreak = true;
                break;
            }
            const orderDate = await order.$eval('.info-left_time', x => x.textContent)
                .then((x) => x!.split(' ')[0]);
            const status = (await order.$eval('.order-item-header--title', x => x.textContent))!;
            const id = (await order.$eval('.order-id-num', x => x.textContent))!;
            const name = (await order.$eval('.goods-list-gooods-info__wrap > div > div', x => x.textContent))!;
            const qty = (await order.$eval('.goods-list-gooods-info__wrap > div > div:nth-child(2)', x => x.textContent))!
                .split('x')
                .map((x) => x.trim())[1];

            const price = (await order.$eval('strong', x => x.textContent))!
                .replace('₹', '')
                .replace(',', '');
            result.push({ status, id, name, qty, price, username, orderDate });
        }
        if (shouldBreak) {
            break;
        }
        const paginationElement = await page.$$('.mi-pagination-item')!;
        if (paginationElement.length == currentPage) {
            break;
        }
        await paginationElement[currentPage].click();
        await page.waitForSelector('.user-order-list-container', { visible: true });
        currentPage += 1;
    }
    record.set('ORDER FETCHED', result.length ?? 0);
    const invoiceDirPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../invoice");
    try {
        await fs.access(invoiceDirPath);
    } catch (e: any) {
        await fs.mkdir(invoiceDirPath);
    }

    for (let order of result) {
        let url = `https://store.mi.com/in/user/orderview/${order.id}`;
        await page.goto(url);
        try {
            await page.waitForSelector('.package-detail__delivery-info', { visible: true });
            const data = await page.evaluate(() => {
                let trackingId = document.querySelector('.package-detail__delivery-info > section > div > span:nth-child(2)')!.textContent;
                const courier = document.querySelector('.package-detail__delivery-info > section > div:nth-child(2) > span:nth-child(2)')!.textContent;
                trackingId = `TD-${trackingId}`;
                return { trackingId, courier };
            });
            order = { ...order, ...data };
            url = `https://store.mi.com/in/user/invoice/${order.id}01`;
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
            await fs.writeFile(path.join(invoiceDirPath, `OD-${order.id}.pdf`), binaryPdf, 'binary');
            order.id = `OD-${order.id}`;
            results.push(order);
        } catch (e: any) { }
    }
    console.log('account processed!');
}

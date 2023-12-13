import { GoogleSpreadsheetRow } from "google-spreadsheet";
import { Page } from "puppeteer";

export async function handleOrderInfo(page: Page, record: GoogleSpreadsheetRow) {
    await page.waitForSelector('.payment-successful', { visible: true, timeout: 300000 });
    await new Promise((r) => setTimeout(r, 1000));
    let info = await page.evaluate(() => {
        return {
            title: document.querySelector('.payment-successful__title')?.innerHTML ?? '',
            orderNumber: `OD${document.querySelector('.payment-successful__info > p:nth-child(4)')?.innerHTML.split(' ')[2] ?? ''}`,
            price: document.querySelector('.payment-successful__info > p:nth-child(3)')?.innerHTML.split('₹')[1].replace(',', ''),
        };
    });
    record.set('ORDER ID', info.orderNumber);
    record.set('PRICE', info.price);
    record.set('QTY', record.get('order quantity') ?? '1');

    if (info.title === '' || info.title?.includes('failed')) {
        throw 'payment failed!';
    }
}

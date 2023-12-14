import puppeteer from "puppeteer";
import { getInfoOutputSpreadSheet, getInfoSpreadSheet, orderSpreadSheet } from "./spreadsheet.js";
import { Command } from "commander";
import { order } from "./functions/order.js";
import { getInfo } from "./functions/getInfo.js";

const program = new Command();

program
    .option('--order', 'start ordering')
    .option('--get-info <number-of-days>', 'start getting info till the number of days')
    .option('--sheet-number <sheet-number>', 'sheet number');

program.parse(process.argv);

async function main() {
    const options = program.opts();
    options.sheetNumber = parseInt(options.sheetNumber ?? '0');
    if (options.order) {
        await orderSpreadSheet.loadInfo()
        const records = await orderSpreadSheet.sheetsByIndex[options.sheetNumber].getRows()

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            if (record.get('ATTEMPTED') === 'Y') {
                continue;
            }
            record.set('ATTEMPTED', 'Y');
            const browser = await puppeteer.launch({ headless: false, args: ['--disable-notifications'], defaultViewport: null });
            const page = await browser.newPage();
            await order(page, record);
            await record.save();
            await browser.close();
        }
    }
    else if (options.getInfo) {
        await getInfoSpreadSheet.loadInfo()
        const records = await getInfoSpreadSheet.sheetsByIndex[options.sheetNumber].getRows();
        await getInfoOutputSpreadSheet.loadInfo()
        const outputSheet = getInfoOutputSpreadSheet.sheetsByIndex[0];

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            if (record.get('ATTEMPTED') === 'Y') {
                continue;
            }
            record.set('ATTEMPTED', 'Y');
            const browser = await puppeteer.launch({ headless: false, args: ['--disable-notifications'], defaultViewport: null });
            const page = await browser.newPage();
            const results: any[] = [];
            await getInfo(page, record, results, +options.getInfo);
            await outputSheet.addRows(results);
            await record.save();
            await browser.close();
        }
    } else {
        program.help();
    }
}

main();


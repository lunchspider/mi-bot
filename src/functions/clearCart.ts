import { Page } from "puppeteer";

export async function clearCart(page: Page) {
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

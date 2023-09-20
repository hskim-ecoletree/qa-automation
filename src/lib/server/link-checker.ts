import puppeteer from 'puppeteer';
import {chain} from 'lodash-es';

export async function check(urls: string[]) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(urls[0]);
    const links = await page.waitForSelector('body a');
    const hrefs = chain(links)
        .filter((link) => link.href)
        .map(anckor => anckor.href)
        .value();
    await browser.close();
    return hrefs;
}
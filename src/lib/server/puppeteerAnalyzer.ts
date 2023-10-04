import type {Result} from "$typ/linkCheckTypes";
import puppeteer, {Browser, PuppeteerLaunchOptions} from "puppeteer";
import {isEmpty} from "lodash-es";
import {concatMap, timer, generate, Observable, EMPTY} from "rxjs";
import axios from "axios";
import random from "random";

const httpClient = axios.create({
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    },
    timeout: 10_000,
});


export async function analyze(path: string, recurse: boolean, concurrency: number = 100, ignores: string | string[] = "", baseUrl?: string): Promise<Result> {
    const serverBaseUrl = baseUrl || path;
    const browser = await puppeteer.launch({ headless: "new", executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
    try {
        return await checkPage(browser, path, []);
    } finally {
        await browser.close();
    }
}

async function checkPage(browser: Browser, url: string, ignores: string[]): Promise<Result> {
    const page = await browser.newPage();
    try {
        const resp = await page.goto(url);
        const txt = await resp.text();
        const anchors = await page.$$eval("a[href]", (els) => els.map(el => ({tagName: "a", text: el.textContent, href: el.getAttribute("href")})));
        const imgs = await page.$$eval("img[src]", (els) => els.map(el => ({tagName: "img", text: el.textContent, src: el.getAttribute("src"), alt: el.getAttribute("alt")})));
        const links = await page.$$eval("link[href]", (els) => els.map(el => ({tagName: "link", href: el.getAttribute("href")})));
        const scripts = await page.$$eval("script[src]", (els) => els.map(el => ({tagName: "script", src: el.getAttribute("src")})));
        console.log(`Response: ${JSON.stringify(resp)}, length: ${txt.length}`);

        return {
            passed: true,
            items: [],
        }
    } catch (e) {
        console.error(`Error while checking ${url}: ${e}`);
        throw e;
    } finally {
        await page.close();
    }
}
/*
1. 요청 시간 딜레이 주기
2. 요청 헤더
2.1. User-Agent
2.2. Referer
3. navigator.webdriver
 */

function checkResourceLinks(links: string[], ignorePredicate: (url: string) => boolean): Observable<{url: string, state: "alive" | "dead" | "error" | "not-found" | "skipped", status: number, failure: any} | never> {
    if (isEmpty(links)) {
        return EMPTY;
    }

    return generate(0, i => i < links.length,  i => i + 1, i => ({
        delaySec: random.uniform(3, 5),
        url: links[i],
    }))
        .pipe();
}

function requestGetApi(url: string): Promise<{url: string, state: "alive" | "dead" | "error" | "not-found" | "skipped", status: number, failure: any}> {
    return httpClient.get(url)
        .then(resp => ({
            url,
            state: "alive",
            status: resp.status,
            statusText: resp.statusText,
            request: resp.request,
            config: resp.config,
            headers: resp.headers,
            failure: null,
        }))
        .catch(e => {
            const isTimeout = e.code === 'ECONNABORTED';
            const isNotFound = e.response?.status === 404;
            const resp = e.response;
            return {
                url,
                state: isTimeout ? "dead" : isNotFound ? "not-found" : "error",
                status: resp?.status || 0,
                statusText: resp?.statusText,
                request: resp?.request,
                config: resp?.config,
                headers: resp?.headers,
                failure: e,
            }
        })
}
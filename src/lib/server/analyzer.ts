import puppeteer, {Browser, HTTPRequest, HTTPResponse, Page} from "puppeteer";
import {lastValueFrom, of, from, toArray, mergeMap} from 'rxjs';
import {expand, finalize, map, takeWhile} from 'rxjs/operators';
import {divide, floor, isNil, isEmpty, trim} from "lodash-es";


export async function findLinksPuppeteer(url: string[]) {
    const browser = await puppeteer.launch({ headless: "new", executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
    const baseUrl = url[0];
    return lastValueFrom(
        from(checkLink(browser, url[0], null, baseUrl,  () => ["mailto:", "tel:", "sms:", "javascript:"]))
            .pipe(
                expand(([result, ignoreList]) => {
                    return of(...result.next)
                        .pipe(mergeMap((nextUrl) => from(checkLink(browser, nextUrl, (result.parent || null), baseUrl, () => [...ignoreList, ...result.next.filter(n => n !== nextUrl)]))
                            .pipe(takeWhile(([r2,igs2]) => !isEmpty(r2.next)))))
                }),
                map(([result,igs]) => result),
                finalize(async () => {
                    console.log("Done");
                    await browser.close();
                }),
                toArray()
            )
    );
}

async function checkLink(browser: Browser, url: string, parentUrl: string | null, baseUrl: string, ignores: () => string[] = () => []): Promise<[Result, string[]]> {
    const page = await browser.newPage();
    const link = url.startsWith("http") ? url : `https://${url}`;
    try {
        const response = await page.goto(link, {timeout: 60_000, waitUntil: ["domcontentloaded"]});
        if (isNil(response)) {
            return [{
                state: ResultState.DEAD,
                request: requestFrom(null),
                response: responseFrom(null),
                parent: parentUrl,
                failure: `Response was missing.`,
                next: [],
            }, [url, link, ...ignores()]];
        } else {
            const state = getState(response);
            const result: Result = {
                url: response.url(),
                request: requestFrom(response.request() || null),
                response: responseFrom(response),
                parent: parentUrl,
                state: state,
                next: [],
            };

            if (state === ResultState.ALIVE) {
                const linkResults = await findAllLinks(page);
                const nextLinks: PageLink[] = linkResults.map(linkResult => {
                    const url = trim(linkResult.url);
                    if (isEmpty(url)
                        || new RegExp("javascript:(.)*", "gi").test(url)
                    ) {
                        return {...linkResult, skip: true, parent: link} as PageLink;
                    } else {
                        let validUrl: string;
                        if (url.startsWith("/")) {
                            validUrl = `${baseUrl}${url}`;
                        } else if (url.startsWith("./")) {
                            validUrl = `${baseUrl}${url.substring(1)}`;
                        } else if (url.startsWith("http")) {
                            validUrl = url;
                        } else {
                            validUrl = `${baseUrl}/${url}`;
                        }
                        const isIgnorePattern = !validUrl.startsWith("http") || ignores().map(pattern => new RegExp(pattern)).some((ignore) => ignore.test(validUrl))
                        return {
                            ltype: linkResult.ltype,
                            url: linkResult.url,
                            skip: isIgnorePattern,
                            validUrl: isIgnorePattern ? null : validUrl,
                            parent: link,
                        } as PageLink;
                    }
                });
                result.next = nextLinks.filter(linkResult => linkResult.ltype === "a" && !linkResult.skip).map(linkResult => linkResult.validUrl || linkResult.url || "");
                const pageLinks = await checkAliveLinks(page, url, nextLinks.filter(linkResult => linkResult.ltype !== "a" || linkResult.skip));
                result.pageResources = pageLinks;
                const nextSkip = [url, link, ...pageLinks.map(pageResource => pageResource.url || ""), ...ignores()];
                result.response = null;
                result.request = null;
                return [result, nextSkip];
            } else if (state === ResultState.DEAD || state === ResultState.NOT_FOUND || state === ResultState.ERROR) {
                result.failure = `Invalid Response given. Status=${response?.status()}(${response?.statusText()})`;
                return [result, [url, link, ...ignores()]];
            } else {
                return [result, [url, link, ...ignores()]];
            }
        }
    } catch (err) {
        console.error(err);
        return [{
            request: null,
            response: null,
            parent: parentUrl,
            state: ResultState.ERROR,
            failure: `Occurred an error while checking the link. ${err}`,
            next: [],
        }, [url, link, ...ignores()]];
    } finally {
        await page.close();
    }
}

async function checkAliveLinks(page: Page, parent: string | null, links: PageLink[]): Promise<Result[]> {
    const result = [];
    for (const link of links) {
        if (link.skip || isNil(link.validUrl)) {
            result.push({
                url: link.url,
                validUrl: link.validUrl,
                request: null,
                response: null,
                parent: parent,
                state: ResultState.SKIPPED,
                next: [],
            });
        } else {
            try {
                const response = await page.goto(link.validUrl, {
                    timeout: 60_000,
                    waitUntil: ["domcontentloaded"]
                });
                if (isNil(response)) {
                    result.push({
                        url: link.url,
                        validUrl: link.validUrl,
                        request: null,
                        response: null,
                        parent: parent,
                        state: ResultState.DEAD,
                        next: [],
                    });
                } else {
                    const state = getState(response);
                    const isFailed = state !== ResultState.ALIVE && state !== ResultState.REDIRECT;
                    result.push({
                        url: link.url,
                        validUrl: link.validUrl,
                        request: isFailed ? requestFrom(response.request() || null) : null,
                        response: isFailed ? responseFrom(response) : null,
                        parent: parent,
                        state: state,
                        next: [],
                    });
                }
            } catch (err) {
                console.error(err);
                result.push({
                    url: link.url,
                    validUrl: link.validUrl,
                    request: null,
                    response: null,
                    parent: parent,
                    state: ResultState.ERROR,
                    failure: `Occurred an error while checking the link. ${err}`,
                    next: [],
                });
            }
        }
    }
    return result;
}

async function findAllLinks(page: Page): Promise<PageLink[]> {
    // img 태그의 src 속성 값 추출
    const imgSrcList = await page.$$eval("img[src]", (imgs) => imgs.map((img) => ({
        ltype: "img",
        url: img?.getAttribute('src')
    }))) as PageLink[];

    // link 태그의 href 속성 값 추출
    const linkHrefList = await page.$$eval("link[href]", (links) => links.map((link) => ({
        ltype: "link",
        url: link?.getAttribute('href')
    }))) as PageLink[];

    // script 태그의 src 속성 값 추출
    const scriptSrcList = await page.$$eval("script[src]", (scripts) => scripts.map((script) => ({
        ltype: "script",
        url: script?.getAttribute('src')
    }))) as PageLink[];

    // a 태그의 href 속성 값 추출
    const aHrefList = await page.$$eval("a[href]",(anchors) => anchors.map((a) => ({
        ltype: "a",
        url: a?.getAttribute('href'),
        text: a?.textContent
    }))) as PageLink[];
    return [...imgSrcList, ...linkHrefList, ...scriptSrcList, ...aHrefList];
}


function getState(response: HTTPResponse | null): ResultState {
    if (response !== null) {
        const status = response.status();
        const codeGroup = floor(divide(status, 100));
        if (codeGroup === 2) {
            return ResultState.ALIVE;
        } else if (codeGroup === 3) {
            return ResultState.REDIRECT;
        } else if (status === 404) {
            return ResultState.NOT_FOUND;
        } else if (status === 408) {
                return ResultState.DEAD;
        } else if (codeGroup === 4 || codeGroup === 5) {
            return ResultState.ERROR;
        }
    }
    return ResultState.DEAD;
}

// function checkUrlPattern(text: string) {
//     new RegExp('^(https?:\/\/)?(www\.)?([A-Za-z0-9@:%._-\u4e00-\u9fa5]+)(:[0-9]+)?(\/[A-Za-z0-9_.-]+)*(\/?[A-Za-z0-9_.-]+\.[A-Za-z]+)?(\/?(\?|#)[A-Za-z0-9_.-]*)*$')
//     new RegExp('^(https?:\/\/)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()!@:%_\+.~#?&\/\/=]*)$')
// }

function requestFrom(req: HTTPRequest | null): Request {
    return {
        method: req?.method(),
        url: req?.url(),
        headers: req?.headers(),
        failure: req?.failure()?.errorText
    };
}

function responseFrom(resp: HTTPResponse | null): Response  {
    return {
        url: resp?.url(),
        status: resp?.status(),
        statusText: resp?.statusText(),
        headers: resp?.headers(),
        timing: resp?.timing() as Timing
    };
}


export type Timing = {
    /**
     * Timing's requestTime is a baseline in seconds, while the other numbers are ticks in
     * milliseconds relatively to this requestTime.
     */
    requestTime: number;
    /**
     * Started resolving proxy.
     */
    proxyStart: number;
    /**
     * Finished resolving proxy.
     */
    proxyEnd: number;
    /**
     * Started DNS address resolve.
     */
    dnsStart: number;
    /**
     * Finished DNS address resolve.
     */
    dnsEnd: number;
    /**
     * Started connecting to the remote host.
     */
    connectStart: number;
    /**
     * Connected to the remote host.
     */
    connectEnd: number;
    /**
     * Started SSL handshake.
     */
    sslStart: number;
    /**
     * Finished SSL handshake.
     */
    sslEnd: number;
    /**
     * Started running ServiceWorker.
     */
    workerStart: number;
    /**
     * Finished Starting ServiceWorker.
     */
    workerReady: number;
    /**
     * Started fetch event.
     */
    workerFetchStart: number;
    /**
     * Settled fetch event respondWith promise.
     */
    workerRespondWithSettled: number;
    /**
     * Started sending request.
     */
    sendStart: number;
    /**
     * Finished sending request.
     */
    sendEnd: number;
    /**
     * Time the server started pushing request.
     */
    pushStart: number;
    /**
     * Time the server finished pushing request.
     */
    pushEnd: number;
    /**
     * Started receiving response headers.
     */
    receiveHeadersStart: number;
    /**
     * Finished receiving response headers.
     */
    receiveHeadersEnd: number;
};

export interface Request {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    failure?: string;
}

export interface Response {
    url?: string;
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    timing?: Timing;
}

export enum ResultState {
    DEAD = 'dead',
    NOT_FOUND = 'not-found',
    ALIVE = 'alive',
    REDIRECT = 'redirect',
    SKIPPED = 'skipped',
    ERROR = 'error',
}
export interface Result {
    url?: string;
    state: ResultState;
    request: Request | null;
    response: Response | null;
    parent?: string | null;
    failure?: string;
    pageResources?: Result[];
    next: string[];
}
export interface PageLink {
    ltype: 'a' | 'img' | 'script' | 'link';
    url?: string | undefined;
    text?: string;
    validUrl?: string;
    skip?: boolean;
    parent?: string | null;
}

/*
docker run -d \
--name neo4j \
-p 7474:7474 -p 7687:7687 \
-v $HOME/neo4j/data:/data \
-v $HOME/neo4j/logs:/logs \
-v $HOME/neo4j/plugins:/plugins \
--env NEO4J_PLUGINS='["apoc", "graph-data-science", "streams", "n10s"]' \
--env NEO4J_AUTH=neo4j/ecole#0450! \
neo4j:5.12.0-bullseye

 */
import {get, isArray, isEmpty, isString, pickBy, split, trim} from "lodash-es";
import {check, LinkState} from "linkinator";
import {json} from "@sveltejs/kit";
import {saveResult} from "$lib/server/db";

export async function POST({request}) {
    const {url, ignores, recurse, concurrency} = await request.json();
    if (!isEmpty(url)) {
        const result = await analyze(url, recurse, concurrency, ignores);
        return json(result, {status: 200});
    }
    return json({errorMessage: "url is empty"}, {status: 400});
}


async function analyze(path: string, recurse: boolean, concurrency: number = 100, ignores: string | string[] = ""): Promise<Result> {
    const ignorePatterns = isArray(ignores) ? ignores : split(ignores, ",").map(trim);
    const startedAt = new Date();
    const result = await check({
        path,
        recurse,
        concurrency: 3,
        linksToSkip: checkIgnore(ignorePatterns),
        timeout: 15_000,
    });
    // await saveResult(path, result, startedAt, new Date(), (`${path}-${startedAt.toISOString()}`).replaceAll("-", "_"));

    return {
        passed: result.passed,
        items: result.links.map(link => ({
                url: link.url,
                parent: link.parent || "",
                state: ((state: LinkState) => {switch (state) {
                    case LinkState.OK: return "alive";
                    case LinkState.BROKEN: return "dead";
                    case LinkState.SKIPPED: return "skipped";
                    default: return "dead";
                }})(link.state),
                status: link.status,
                failure: link.failureDetails?.map(toFailureMessage).join("\n")
            }
        ))
    };
}

function checkIgnore(patterns: string[]) {
    return async (url: string) => patterns.map(p => new RegExp(p, "g")).some(regex => regex.test(url));
}

function toFailureMessage(failure: object): string {
    return `{"config": ${get(failure, "config")}, "headers": ${get(failure, "headers")}, "status": ${get(failure, "status")} (${get(failure, "statusText")}), "data": ${pickBy(get(failure, "data"), (v, k) => isString(k) && !k.startsWith("_"))}}`;
}

export interface Result {
    passed: boolean;
    items: Array<LinkItem>
}

export interface LinkItem {
    url: string;
    parent: string;
    state: "alive" | "dead" | "skipped";
    status?: number;
    failure?: string;
}

// const defaultIgnorePatterns = [
//     "javascript:"
//     , "mailto:"
//     ,"{{"
//     ,".css"
//     ,".js"
//     ,".gif"
//     ,".png"
//     ,".jpg"
//     ,".jpeg"
//     ,".svg"
//     ,".webm"
//     ,".mpeg"
//     ,".wav"
//     ,".mp4"
//     ,"PNG$"
//     ,".ttf"
//     ,".woff"
//     ,".eot"
//     ,".cur"
//     ,".otf"
//     ,".ico"
//     ,"/search/"
//     ,"/support/"
//     ,"/multistore/"
//     ,"https://account.samsung.com/"
//     ,"http://csr.samsung.com/en/main.do"
//     ,"http://csr.samsung.com/"
//     ,"signInGate"
//     ,"signOutGate"
//     ,"/global/"
//     ,"[SKU]"
//     ,"/function/ipredirection/ipredirectionLocalList/"
// ];

/*

 */
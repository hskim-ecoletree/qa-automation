import {isArray, isEmpty, split, trim} from "lodash-es";
import {check, LinkState} from "linkinator";
import {json} from "@sveltejs/kit";
import {saveResult} from "$lib/db/rdb";
import moment from 'moment';
import {toFailureMessageFromLinkResult} from "../../lib/helper/linkinatorModelHelper";

export async function POST({request}) {
    try {
        const {url, ignores, recurse, concurrency} = await request.json();
        if (!isEmpty(url)) {
            const result = await analyze(url, recurse, concurrency, ignores);
            return json(result, {status: 200});
        }
    } catch (e) {
        console.error(e);
        return json({errorMessage: e.message}, {status: 400});
    }
    return json({errorMessage: "Invalid request."}, {status: 400});
}


async function analyze(path: string, recurse: boolean, concurrency: number = 100, ignores: string | string[] = ""): Promise<Result> {
    const ignorePatterns = isArray(ignores) ? ignores : split(ignores, ",").map(trim);
    const startedAt = new Date();
    const result = await check({
        path,
        recurse,
        concurrency,
        linksToSkip: checkIgnore(ignorePatterns),
        timeout: 15_000,
    });
    const sessionKey = moment(startedAt).format("YYMMDD[T]HH:mm:ssZZ") + path.replace(/^https?:\/\//, "");
    await saveResult(sessionKey, result, {url: path, ignores: ignorePatterns, recurse, concurrency}, startedAt, new Date());

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
                failure: toFailureMessageFromLinkResult(link)
            }
        ))
    };
}

function checkIgnore(patterns: string[]) {
    return async (url: string) => patterns.map(p => new RegExp(p, "g")).some(regex => regex.test(url));
}
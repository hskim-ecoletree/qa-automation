import {check, LinkState} from "linkinator";
import {from, lastValueFrom, map as rMap, mergeMap, of, toArray} from "rxjs";
import {expand, takeWhile} from "rxjs/operators";
import {get, isArray, isEmpty, isString, map, pickBy, split} from "lodash-es";

// import {fail} from "@sveltejs/kit";

export async function analyze(rootUrl: string, ignoreOptions: string | string[]) {
    const ignore = isArray(ignoreOptions) ? ignoreOptions : [...split(ignoreOptions, ",")];
    const processingDoneLinks: string[] = [];
    return lastValueFrom(
        from(check({
            linksToSkip: filterIgnorePattern([...ignore, ...processingDoneLinks]),
            recurse: false,
            concurrency: 500,
            path: rootUrl,
            timeout: 15_000,
        }))
            .pipe(
                expand((result) => {
                    const linkUrls = (result.links || []).map(link => link.url);
                    linkUrls.forEach(l => processingDoneLinks.push(l));
                    const nextPageUrl = linkUrls.filter(filterNonHtmlLink).filter(filterIgnorePattern([...ignore, ...processingDoneLinks]));
                    return of(...nextPageUrl)
                        .pipe(mergeMap((url) => {
                            console.log(`processing ${url}`);
                                return from(check({
                                    path: url,
                                    linksToSkip: filterIgnorePattern([...ignore, ...(processingDoneLinks).filter(ignoreUrl => ignoreUrl !== url)]),
                                    recurse: false,
                                    concurrency: 500,
                                    timeout: 15_000,
                                }))
                                    .pipe(takeWhile(res => {
                                        const checked = (res.links || []);
                                        return isEmpty(checked) || checked.filter(l => l.state !== LinkState.SKIPPED).length > 0;
                                    }));
                            }
                        ))
                }),
                rMap((results) => {
                    return map((results.links || []), (link) => ({
                        url: link.url,
                        state: toState(link.state),
                        parent: link.parent,
                        failure: toFailureMessage((link.failureDetails || []).filter(failure => !isEmpty(failure))[0] || {}),
                    }));
                }),
                toArray(),
            ));
    // const results = await check({
    //         linksToSkip: ignore,
    //         recurse: false,
    //         concurrency: 500,
    //         path: rootUrl,
    //         timeout: 15_000,
    //     });
    // return {
    //     success: results.passed,
    //     data: map(results.links || [],(link) => ({
    //         url: link.url,
    //         state: toState(link.state),
    //         parent: link.parent,
    //         failure: toFailureMessage((link.failureDetails || []).filter(failure => !isEmpty(failure))[0] || {}),
    //     }))
    // };
}

function toState(state: LinkState): string {
    switch (state) {
        case LinkState.OK:
            return "alive";
        case LinkState.BROKEN:
            return "not-found";
        case LinkState.SKIPPED:
            return "skipped";
        default:
            return "dead";
    }
}

function toFailureMessage(failure: object): string {
    return `{"config": ${get(failure, "config")}, "headers": ${get(failure, "headers")}, "status": ${get(failure, "status")} (${get(failure, "statusText")}), "data": ${pickBy(get(failure, "data"), (v, k) => isString(k) && !k.startsWith("_"))}}`;
}

function filterIgnorePattern(ignore: string[] = []) {
    const ignorePatterns = ignore.map(i => new RegExp(i));
    return async (url: string) => {
        const isSkip = ignorePatterns.some(pattern => pattern.test(url));
        console.error(`skip ${url} : ${isSkip}`);
        return isSkip;
    };
}

function filterNonHtmlLink(url: string): boolean {
    if (new RegExp(/\.html$/).test(url)) {
        return true;
    } else if (new RegExp(/\.(jpg|jpeg|png|gif|mp4|webm|avi|mov|mp3|zip|rar|tar|gz|7z|)$/, "gi").test(url)) {
        return false;
    } else {
        return !new RegExp(/\.(js|css|scss|json)$/, "gi").test(url);
    }
}
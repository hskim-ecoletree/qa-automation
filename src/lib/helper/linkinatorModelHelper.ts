import {filter, map, isNil, omitBy, isArray, mapValues, isObject, isEmpty} from "lodash-es";
import type { LinkResult } from "linkinator";
import type {Failure} from "$typ/linkCheckTypes";

export function failureDetails2Failures(failureDetails: Array<any> | null | undefined): Failure[] | null {
    if (isNil(failureDetails)) {
        return null;
    }

    const failures = failureDetails.map(f => f as Failure).map(skipNil).filter(it => !isNil(it));
    return isEmpty(failures) ? null : failures;
}

export function toFailureMessageFromLinkResult(result: LinkResult): string | null {
    if (!isEmpty(result.failureDetails)) {
        const failures: Failure[] = result.failureDetails.map(f => f as Failure);
        return toFailureMessage(failures);
    }
    return null;
}

export function toFailureMessage(failures: Failure[] = []): string | null {
    if (!isEmpty(failures)) {
        const failureList = failures.map(failure => skipNil(failure))
            .filter(it => !isNil(it))
            .map(JSON.stringify);
        return isEmpty(failureList) ? null : failureList.join("\n");
    }
    return null;
}

function skipNil<T>(value: T): T | null {
    if (isNil(value)) {
        return null;
    } else if (isArray(value)) {
        return filter(map(value, skipNil), item => !isNil(item));
    } else if (isObject(value)) {
        return mapValues(omitBy(value, (v, k) => isNil(v) || isNil(k)), skipNil);
    } else {
        return isNil(value) ? null : value;
    }
}



/*
[
    {
      "data": undefined,
      "message": "request to https://www.sgs.com/performance/ failed, reason: Parse Error: Invalid header value char",
      "type": "system",
      "errno": "HPE_INVALID_HEADER_TOKEN",
      "code": "HPE_INVALID_HEADER_TOKEN",
      "config": {
        "method": "HEAD",
        "url": "https://www.sgs.com/performance/",
        "headers": {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.117 Safari/537.36"
        },
        "responseType": "stream",
        "timeout": 15000
      }
    },
    {
      "status": undefined,
      "statusText": undefined,
      "request": {
        "responseURL": "https://www.sgs.com/performance/",
        "status": undefined,
        },
      "message": "request to https://www.sgs.com/performance/ failed, reason: Parse Error: Invalid header value char",
      "type": "system",
      "errno": "HPE_INVALID_HEADER_TOKEN",
      "code": "HPE_INVALID_HEADER_TOKEN",
      "config": {
        "method": "GET",
        "url": "https://www.sgs.com/performance/",
        "responseType": "stream",
        "headers": {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.117 Safari/537.36"
        },
        "timeout": 15000
      }
    },
    null
  ]
 */
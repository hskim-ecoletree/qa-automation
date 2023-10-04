import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { checkResult, checkSession } from '$schema/schema';
import {from, lastValueFrom, mergeMap, toArray} from "rxjs";

import type { LinkResult } from "linkinator";
import {toFailureMessageFromLinkResult} from "../helper/linkinatorModelHelper";
import {chunk, isEmpty, isNil, map} from "lodash-es";

const sqlite = new Database('./linkinator.db');
const db: BetterSQLite3Database = drizzle(sqlite);

export async function saveResult(
    sessionKey: string,
    result: { passed: boolean, links: LinkResult[] },
    options: {url: string, ignores: string[], recurse: boolean, concurrency: number},
    startedAt: Date,
    finishedAt: Date
) {
    await db.transaction(async (tx) => {
        try {
            const [{sessionId}] = await tx.insert(checkSession).values({
                key: sessionKey,
                url: options.url,
                ignores: options.ignores.join(","),
                recurse: options.recurse,
                concurrency: options.concurrency,
                passed: result.passed,
                startedAt,
                finishedAt,
            }).returning({sessionId: checkSession.id});
            if (isNil(sessionId)) {
                throw new Error("Failed to insert check session data.");
            }

            const results = result.links.map(link => ({
                sessionId,
                url: link.url,
                parent: link.parent || null,
                state: link.state,
                status: link.status,
                failure: toFailureMessageFromLinkResult(link),
            }));
            const chunkedResults = chunk(results, 50);
            await lastValueFrom(
                from(...chunkedResults)
                .pipe(
                    mergeMap(chunked => from(tx.insert(checkResult).values(chunked))),
                    toArray()
                )
            );
            console.log("inserted");
        } catch (e) {
            console.error(e);
            await tx.rollback();
            throw e;
        }
    });
}




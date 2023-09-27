import neo4j, {
    LocalDateTime,
    Transaction
} from "neo4j-driver";
import {isEmpty, isNil, map} from "lodash-es";
import type {LinkResult} from "linkinator";

const driver = neo4j.driver("neo4j://localhost:7687", neo4j.auth.basic("neo4j", "ecole#0450!"));

export async function saveResult(url: string, result: {links: LinkResult[]; passed: boolean;}, startedAt: Date, finishedAt: Date, tag: string) {
    const session = driver.session();
    let tx: Transaction | null = null;
    try {
        tx = await session.beginTransaction();
        const checkResultProps = resultToNodeProperties(url, result, startedAt, finishedAt, tag);
        const checkResultQuery = `CREATE (c:CHECK${result.passed ? ":PASSED" : ""} {url: $url, passed: $passed, tag: $tag, startedAt: $startedAt, finishedAt: $finishedAt}) RETURN c`;
        const checkResult = await tx.run(checkResultQuery, checkResultProps);
        checkResult.records.forEach(record => console.log(record.get("c")));

        const linksParameter = saveLinksParameter(checkResultProps.tag, result.links);
        const linksQuery = "UNWIND $links AS link\n" +
            `MATCH (c:CHECK {tag: '${tag}'})\n`+
            "MERGE (c)-[:INCLUDES]->(src:LINK {url: link.srcUrl})\n" +
            "MERGE (c)-[:INCLUDES]->(dst:LINK {url: link.dstUrl})\n" +
            "MERGE (src)-[rel:LINK_TO {source: link.source, checkKey: link.checkKey}]->(dst)\n" +
            "SET src += link, dst += link, rel += link";
        const linksResult = await tx.run(linksQuery, {links: linksParameter});
        console.log(JSON.stringify(linksResult.summary.counters.updates()));

        const linkStateParameter = linksToNodeProperties(url, result.links);
        const linkStateQuery = "UNWIND $links AS link\n" +
            `MATCH (c:CHECK {tag: '${tag}'})\n`+
            "MATCH (src:LINK {url: link.parent})\n" +
            "MATCH (dst:LINK {url: link.url})\n" +
            "MERGE (c)-[:INCLUDES]->(res:CHECK_RESULT {url: link.url, parent: link.parent, state: link.state, status: link.status, failure: link.failure})\n" +
            "MERGE (src)-[rel1:CHECK_TO]->(res)-[rel2:CHECK_FROM]->(dst)\n" +
            "SET res += link, rel1 += link, rel2 += link";
        const linkStateResult = await tx.run(linkStateQuery, {links: linkStateParameter});
        console.log(JSON.stringify(linkStateResult.summary.counters.updates()));

        await tx.commit();
    } catch (e) {
        console.error(e);
        if (tx) {
            await tx?.rollback();
        }
    } finally {
        if (tx) {
            await tx?.close();
        }
        await session.close();
    }
}

function resultToNodeProperties(url: string, result: {links: LinkResult[]; passed: boolean;}, startedAt: Date, finishedAt: Date, tag: string): CheckResultProps {
    return {
        url: url,
        passed: result.passed,
        tag: tag,
        startedAt: LocalDateTime.fromStandardDate(startedAt),
        finishedAt: LocalDateTime.fromStandardDate(finishedAt)
    };
}

function saveLinksParameter(key: string, links: LinkResult[] = []) {
    return links.map(link => ({srcUrl: link.parent || "ROOT", dstUrl: link.url, source: isEmpty(link.parent) ? "ROOT" : getLinkSource(link.url), checkKey: key}));
}

function getLinkSource(url: string) {
    if (new RegExp(".(css|scss|less)$", "g").test(url)) {
        return "STYLESHEET";
    } else if (new RegExp(".(js|ts|jsx|tsx|json)$", "g").test(url)) {
        return "SCRIPT";
    } else if (new RegExp(".(png|jpg|jpeg|gif|svg|webp)$", "gi").test(url)) {
        return "IMG";
    } else {
        return "A";
    }
}

function linksToNodeProperties(url: string, links: LinkResult[]): Array<LinkProps> {
    return links.map(link => ({
        url: link.url,
        parent: url,
        state: getState(link),
        status: link.status,
        failure: toFailure(link.failureDetails).message || "",
    }));
}

export function getState(linkResult: LinkResult): "ALIVE" | "DEAD" | "NOT-FOUND" | "ERROR" | "SKIPPED" {
    const status = linkResult.status;
    const state = linkResult.state;

    switch (state) {
        case "OK":
            return "ALIVE";
        case "SKIPPED":
            return "SKIPPED";
        case "BROKEN":
            if (isNil(status)) {
                return "DEAD";
            } else if (status === 404) {
                return "NOT-FOUND";
            } else if (status >= 500 || status < 100 || status >= 400) {
                return "ERROR";
            } else {
                return "DEAD";
            }
        default:
            return "DEAD";
    }
}

export function toFailure(failureDetails: Array<{[key: string]: any}> | null | undefined): { message?: string; summary?: Array<{ request ? : Req; response ? : Resp; }> } {
    if (isEmpty(failureDetails)) {
        return {};
    } else {
        const summary = map(failureDetails, failure => {
            const result: { request ? : Req; response ? : Resp; } = {};
            if (!isEmpty(failure?.config)) {
                result.request = {
                    method: failure.config.method,
                    headers: failure.config.headers,
                    responseType: failure.config.responseType
                };
            }

            if (!isEmpty(failure.headers) || !isNil(failure.status) || !isNil(failure.statusText)) {
                result.response = {
                    headers: failure.headers,
                    status: failure.status,
                    statusText: failure.statusText
                };
            } else if (!isNil(failure.message) || !isNil(failure.code) || !isNil(failure.errno)) {
                result.response = {
                    error: `{"errno": ${failure.errno}, "code": ${failure.code}, "message": ${failure.message}}`
                };
            }
            return result;
        });

        if (isEmpty(summary)) {
            return {};
        } else {
            return {summary, message: JSON.stringify(summary)};
        }
    }
}

export interface CheckResultProps {
    url: string;
    passed: boolean;
    tag: string;
    startedAt: LocalDateTime<number>;
    finishedAt: LocalDateTime<number>;
}

export interface LinkProps {
    url: string;
}

export interface LinkToProps {
    source: "A" | "IMG" | "STYLESHEET" | "SCRIPT" | "CODE" | "OTHERS";
    checkKey: string;
}

export interface LinkStateProps {
    url: string;
    status: number;
    state: "ALIVE" | "DEAD" | "NOT-FOUND" | "ERROR" | "SKIPPED";
    failure: string;
    checkedAt: LocalDateTime;
}

export interface Req {
    headers: { [key: string]: string };
    method: string;
    responseType: string;
}

export interface Resp {
    status?: number;
    statusText?: string;
    headers?: { [key: string]: string };
    error?: string;
}
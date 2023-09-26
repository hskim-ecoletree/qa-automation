import neo4j, {
    LocalDateTime,
    Transaction
} from "neo4j-driver";
import {LinkItem, Result} from "../../routes/test/+server";
import {isEmpty} from "lodash-es";

const driver = neo4j.driver("neo4j://localhost:7687", neo4j.auth.basic("neo4j", "ecole#0450!"));

export async function saveResult(url: string, result: Result, startedAt: Date, finishedAt: Date, tag?: string) {
    const session = driver.session();
    let tx: Transaction;
    try {
        tx = await session.beginTransaction();
        const checkResultProps = resultToNodeProperties(url, result, startedAt, finishedAt, tag);
        const checkResultQuery = `CREATE (c:CHECK${result.passed ? ":PASSED" : ""} {url: $url, passed: $passed, tag: $tag, startedAt: $startedAt, finishedAt: $finishedAt}) RETURN c`;
        const checkResult = await tx.run(checkResultQuery, checkResultProps);
        checkResult.records.forEach(record => console.log(record.get("c")));

        const linksParameter = saveLinksParameter(checkResultProps.tag, result.links);
        const linksQuery = "UNWIND $links AS link\n" +
            "MERGE (src:LINK {url: link.srcUrl})\n" +
            "MERGE (dst:LINK {url: link.dstUrl})\n" +
            "MERGE (src)-[rel:LINK_TO {source: link.source, checkKey: link.checkKey}]->(dst)\n" +
            "SET src += link, dst += link, rel += link";
        const linksResult = await tx.run(linksQuery, {links: linksParameter});
        console.log(linksResult.summary.counters.updates().toString());

        await tx.commit();
    } catch (e) {
        console.error(e);
        await tx.rollback();
    } finally {
        if (tx) {
            await tx.close();
        }
        await session.close();
    }
}

function resultToNodeProperties(url: string, result: Result, startedAt: Date, finishedAt: Date, tag?: string): CheckResultProps {
    return {
        url: url,
        passed: result.passed,
        tag: tag || `${url}-${startedAt.toISOString()}`,
        startedAt: LocalDateTime.fromStandardDate(startedAt),
        finishedAt: LocalDateTime.fromStandardDate(finishedAt)
    };
}

function saveLinksParameter(key: string, links: LinkItem[] = []) {
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

function linksToNodeProperties(url: string, links: Array<LinkItem>): Array<LinkProps> {
    return links.map(link => ({
        url: link.url,
        parent: url,
        state: link.state,
        status: link.status,
        failure: link.failure
    }));
}

export interface CheckResultProps {
    url: string;
    passed: boolean;
    tag: string | null;
    startedAt: LocalDateTime;
    finishedAt: LocalDateTime;
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
    request: Req | null;
    response: Resp | null;
    failure: string | null;
    checkedAt: LocalDateTime;
}

export interface Req {
    headers: { [key: string]: string };
    method: "POST" | "GET" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";
}

export interface Resp {
    status: number;
    statusText?: string;
    headers: { [key: string]: string };
}
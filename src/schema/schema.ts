import {integer, sqliteTable, text} from "drizzle-orm/sqlite-core";

// Tables
export const checkSession = sqliteTable('tbl_check_session', {
    id: integer('id', { mode: "number" }).primaryKey({ autoIncrement: true }),
    key: text('session_key'),
    url: text('url'),
    ignores: text('ignores'),
    recurse: integer('recurse', { mode: "boolean" }),
    concurrency: integer('concurrency', { mode: "number" }),
    passed: integer('passed', { mode: "boolean" }).default(0),
    startedAt: integer('started_at', { mode: "timestamp_ms" }),
    finishedAt: integer('finished_at', { mode: "timestamp_ms" }),
});

export const checkResult = sqliteTable('tbl_check_result', {
    id: integer('id', { mode: "number" }).primaryKey({ autoIncrement: true }),
    sessionId: integer('session_id', { mode: "number" }).references(() => checkSession.id),
    url: text('url'),
    parent: text('parent'),
    state: text('state'),
    status: integer('status', { mode: "number" }),
    failure: text('failure', { mode: "json" }),
});
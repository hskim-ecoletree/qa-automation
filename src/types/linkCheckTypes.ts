export interface Result {
    passed: boolean;
    items: Array<LinkItem>
}

export interface LinkItem {
    url: string;
    parent: string;
    state: "alive" | "dead" | "skipped" | "not-found" | "error" | "unknown";
    status?: number;
    failure?: string | null;
}

export interface Failure {
    status?: number;
    statusText?: string;
    message?: string;
    type?: string;
    errno?: string;
    code?: string;
    headers?: { [key: string]: string };
    config: {
        method: "HEAD" | "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS" | "TRACE" | "PATCH";
        url: string;
        headers: { [key: string]: string };
        responseType: string;
        timeout?: number;
    },
    request?: {
        responseURL: string;
    }
}
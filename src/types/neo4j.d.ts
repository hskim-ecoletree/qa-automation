import {Integer, LocalDateTime, Node, Relationship} from "neo4j-driver";

export enum LinkType {
    PAGE = "PAGE",
    EXTERNAL_LINK = "EXTERNAL_LINK",
    RESOURCE = "RESOURCE",
}

export enum State {
    ALIVE = "ALIVE",
    DEAD = "DEAD",
    NOT_FOUND = "NOT_FOUND",
    ERROR = "ERROR",
    SKIPPED = "SKIPPED",
}

export enum LinkSource {
    ANCHOR = "ANCHOR",
    IMG = "IMG",
    LINK = "LINK",
    SCRIPT = "SCRIPT",
    CODE = "CODE",
}

//////////////////////////
//// Node definitions ////
//////////////////////////
export type CheckSession = Node<Integer, CheckSessionProps>;
export interface CheckSessionProps {
    tag?: string | null;
    startedAt: LocalDateTime;
    finishedAt: LocalDateTime | null;
    url: string[];
    recurse: boolean;
    concurrency: number;
    ignores: string[];
}

export type Link = Node<Integer, LinkProps>;
export interface LinkProps {
    url: string;
    type: LinkType;
}

export type LinkState = Node<Integer, LinkCheckResultProps>;
export interface LinkStateProps {
    state: State;
}

//////////////////////////////////
//// Relationship definitions ////
//////////////////////////////////
// CheckSession -[Contains]-> Link
// CheckSession -[Contains]-> LinkState
export type Contains = Relationship;

// Link -[LinkTo]-> Link
export type LinkTo = Relationship<Integer, LinkToProps>;
export interface LinkToProps {
    source: LinkSource;
    text?: string | null;
    position?: string | null;
}

// Link -[CheckFrom]-> LinkState
export type checkFrom = Relationship<Integer, LinkCheckResultProps>;
// LinkState -[CheckTo]-> Link
export type checkTo = Relationship<Integer, LinkCheckResultProps>;

export interface LinkCheckResultProps {
    linkToId: Integer | number;
    state: State;
    checkedAt: LocalDateTime;
    failure: string | null;
    response?: string | null;
    request?: string | null;
}
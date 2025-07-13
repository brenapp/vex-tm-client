import type { APIResult, Client } from "./Client.js";
import { TMErrors } from "./utils/TMErrors.js";
import { MatchTuple } from "./Match.js";
import EventEmitter from "node:events";
import { WebSocket } from "ws";

export type Field = {
    id: number;
    name: string;
};

export type FieldsetData = {
    id: number;
    name: string;
};

// Events
export type FieldsetEventFieldMatchAssigned = {
    readonly type: "fieldMatchAssigned";
    fieldID: number;
    match: MatchTuple;
};

export type FieldsetEventFieldActivated = {
    readonly type: "fieldActivated";
    fieldID: number;
};

export type FieldsetEventMatchStarted = {
    readonly type: "matchStarted";
    fieldID: number;
};

export type FieldsetEventMatchStopped = {
    readonly type: "matchStopped";
    fieldID: number;
};

export enum FieldsetAudienceDisplay {
    Blank = "BLANK",
    Logo = "LOGO",
    Intro = "INTRO",
    InMatch = "IN_MATCH",
    SavedMatchResults = "RESULTS",
    Schedule = "SCHEDULE",
    Rankings = "RANKINGS",
    SkillsRankings = "SC_RANKINGS",
    AllianceSelection = "ALLIANCE_SELECTION",
    ElimBracket = "BRACKET",
    Slides = "AWARD",
    Inspection = "INSPECTION",
}

export type FieldsetEventAudienceDisplayChanged = {
    type: "audienceDisplayChanged";
    display: FieldsetAudienceDisplay;
};
export type FieldsetEventTypes = FieldsetEvent["type"];

export type FieldsetEvent =
    | FieldsetEventFieldMatchAssigned
    | FieldsetEventFieldActivated
    | FieldsetEventMatchStarted
    | FieldsetEventMatchStopped
    | FieldsetEventAudienceDisplayChanged;

// Commands
export type FieldsetCommandStartMatch = {
    cmd: "start";
    fieldID: number;
};

export type FieldsetCommandEndMatchEarly = {
    cmd: "endEarly";
    fieldID: number;
};

export type FieldsetCommandAbortMatch = {
    cmd: "abort";
    fieldID: number;
};

export type FieldsetCommandResetTimer = {
    cmd: "reset";
    fieldID: number;
};

export type FieldsetCommandQueuePreviousMatch = {
    cmd: "queuePrevMatch";
};

export type FieldsetCommandQueueNextMatch = {
    cmd: "queueNextMatch";
};

export enum FieldsetQueueSkillsType {
    Programming = 1,
    Driver = 2,
}

export type FieldsetCommandQueueSkills = {
    cmd: "queueSkills";
    skillsID: FieldsetQueueSkillsType;
};

export type FieldsetCommandSetAudienceDisplay = {
    cmd: "setAudienceDisplay";
    display: FieldsetAudienceDisplay;
};

export type FieldsetCommand =
    | FieldsetCommandStartMatch
    | FieldsetCommandEndMatchEarly
    | FieldsetCommandAbortMatch
    | FieldsetCommandResetTimer
    | FieldsetCommandQueuePreviousMatch
    | FieldsetCommandQueueNextMatch
    | FieldsetCommandQueueSkills
    | FieldsetCommandSetAudienceDisplay;

export type FieldsetCommandTypes = FieldsetCommand["cmd"];

// Fieldset State
export enum FieldsetActiveMatchType {
    None,
    Timeout,
    Match,
}

export enum FieldsetQueueState {
    Unplayed,
    Running,
    Stopped,
}

export type FieldsetMatch =
    | {
          type: FieldsetActiveMatchType.None;
      }
    | {
          type: FieldsetActiveMatchType.Timeout;
          state: FieldsetQueueState;
          fieldID: number;
          active: boolean;
      }
    | {
          type: FieldsetActiveMatchType.Match;
          state: FieldsetQueueState;
          match: MatchTuple;
          fieldID: number;
          active: boolean;
      };

export type FieldsetState = {
    match: FieldsetMatch;
    audienceDisplay: FieldsetAudienceDisplay;
};

export type FieldsetEvents = {
    [K in FieldsetEventTypes]: (
        event: Extract<FieldsetEvent, { type: K }>
    ) => void;
} & {
    message: (event: FieldsetEvent) => void;
};

export interface Fieldset {
    on<U extends keyof FieldsetEvents>(
        event: U,
        listener: FieldsetEvents[U]
    ): this;
    once<U extends keyof FieldsetEvents>(
        event: U,
        listener: FieldsetEvents[U]
    ): this;
    off<U extends keyof FieldsetEvents>(
        event: U,
        listener: FieldsetEvents[U]
    ): this;
}

export class Fieldset extends EventEmitter implements FieldsetData {
    id: number;
    name: string;
    client: Client;
    websocket: WebSocket | null = null;

    events: EventTarget = new EventTarget();

    state: FieldsetState = {
        match: {
            type: FieldsetActiveMatchType.None,
        },
        audienceDisplay: FieldsetAudienceDisplay.Blank,
    };

    constructor(client: Client, data: FieldsetData) {
        super();
        this.id = data.id;
        this.name = data.name;
        this.client = client;
    }

    /**
     * Gets the fields associated with this fieldset
     * @returns Fields if successful, error if not
     **/
    getFields(): Promise<APIResult<Field[]>> {
        return this.client
            .get<{ fields: Field[] }>(`/api/fieldsets/${this.id}/fields`)
            .then((result) => {
                if (result.success) {
                    return {
                        ...result,
                        data: result.data.fields,
                    };
                } else {
                    return result;
                }
            });
    }

    /**
     * Internal - Updates fieldset state based on an event
     * @param event Event State
     */
    updateState(event: FieldsetEvent) {
        switch (event.type) {
            case "audienceDisplayChanged": {
                this.state.audienceDisplay = event.display;
                break;
            }

            case "fieldMatchAssigned": {
                const isNone =
                    Object.keys(event.match).length === 0 &&
                    Object.is(null, event.fieldID);

                // Technically, this could be a timeout, but we don't know until it starts
                if (isNone) {
                    this.state.match = {
                        type: FieldsetActiveMatchType.None,
                    };
                } else {
                    const isTimeout = Object.keys(event.match).length === 0;
                    this.state.match = {
                        type: isTimeout
                            ? FieldsetActiveMatchType.Timeout
                            : FieldsetActiveMatchType.Match,
                        match: event.match,
                        fieldID: event.fieldID,
                        state: FieldsetQueueState.Unplayed,
                        active: false,
                    };
                }
                break;
            }

            case "fieldActivated": {
                switch (this.state.match.type) {
                    case FieldsetActiveMatchType.None: {
                        this.state.match = {
                            type: FieldsetActiveMatchType.Timeout,
                            state: FieldsetQueueState.Unplayed,
                            fieldID: event.fieldID,
                            active: true,
                        };
                        break;
                    }
                    case FieldsetActiveMatchType.Timeout:
                    case FieldsetActiveMatchType.Match: {
                        this.state.match.active = true;
                        this.state.match.fieldID = event.fieldID;
                        break;
                    }
                }
                break;
            }

            case "matchStarted": {
                switch (this.state.match.type) {
                    case FieldsetActiveMatchType.None: {
                        this.state.match = {
                            type: FieldsetActiveMatchType.Timeout,
                            state: FieldsetQueueState.Running,
                            fieldID: event.fieldID,
                            active: false,
                        };
                        break;
                    }
                    case FieldsetActiveMatchType.Timeout:
                    case FieldsetActiveMatchType.Match: {
                        this.state.match.state = FieldsetQueueState.Running;
                        this.state.match.fieldID = event.fieldID;
                        break;
                    }
                }
                break;
            }

            case "matchStopped": {
                switch (this.state.match.type) {
                    case FieldsetActiveMatchType.Timeout:
                    case FieldsetActiveMatchType.Match: {
                        this.state.match.state = FieldsetQueueState.Stopped;
                        break;
                    }
                }
                break;
            }
        }
    }

    /**
     * Connects to the fieldset
     * @returns API result, success is true if the connection was successful, false if there was an error
     **/
    async connect(): Promise<APIResult<WebSocket>> {
        const url = new URL(
            `/api/fieldsets/${this.id}`,
            this.client.connectionArgs.address
        );
        url.protocol = "ws";

        const result = await this.client.ensureBearer();
        if (!result.success) {
            return {
                success: false,
                error: result.error,
            };
        }

        try {
            const authHeaders = this.client.getAuthorizationHeaders(url);

            let headers: Record<string, string> = {};
            authHeaders.forEach((value, key) => (headers[key] = value));

            const socket = new WebSocket(url, { headers });

            return new Promise((resolve) => {
                socket.addEventListener("open", () => {
                    this.websocket = socket;
                    resolve({
                        success: true,
                        data: socket,
                        cached: false,
                    });
                });

                socket.addEventListener("error", (e) => {
                    resolve({
                        success: false,
                        error: TMErrors.WebSocketError,
                        error_details: e,
                    });
                });

                socket.addEventListener("message", (event) => {
                    let dataStr: string;
                    if (typeof event.data === "string") {
                        dataStr = event.data;
                    } else if (Buffer.isBuffer(event.data)) {
                        dataStr = event.data.toString("utf8");
                    } else if (event.data instanceof ArrayBuffer) {
                        dataStr = new TextDecoder().decode(event.data);
                    } else {
                        // Handle Buffer[] case
                        dataStr = Buffer.concat(
                            event.data as Buffer[]
                        ).toString("utf8");
                    }
                    const data = JSON.parse(dataStr) as FieldsetEvent;
                    this.updateState(data);
                    this.emit(data.type, data);
                    this.emit("message", data);
                });
            });
        } catch (e) {
            return {
                success: false,
                error: TMErrors.WebSocketInvalidURL,
                error_details: e,
            };
        }
    }

    /**
     * Disconnects from the fieldset websocket
     **/
    async disconnect() {
        this.websocket?.close();
    }

    /**
     * Sends a command to the fieldset
     * @param command The fieldset command to send
     * @returns API result, success is true if the command was sent, false if there was an error
     **/
    async send(command: FieldsetCommand): Promise<APIResult<void>> {
        const body = JSON.stringify(command);

        try {
            return new Promise((resolve) => {
                if (!this.websocket) {
                    resolve({
                        success: false,
                        error: TMErrors.WebSocketClosed,
                    });
                } else {
                    try {
                        this.websocket.send(body);
                    } catch (error) {
                        if (error) {
                            resolve({
                                success: false,
                                error: TMErrors.WebSocketError,
                                error_details: error,
                            });
                        } else {
                            resolve({
                                success: true,
                                data: undefined,
                                cached: false,
                            });
                        }
                    }
                }
            });
        } catch (e) {
            return {
                success: false,
                error: TMErrors.WebSocketClosed,
                error_details: e,
            };
        }
    }

    /**
     * Starts the currently queued match on the given field
     * @param fieldID Field ID to run the match on
     * @returns success if the message send was successful, false if there was an error
     **/
    startMatch(fieldID: number): Promise<APIResult<void>> {
        return this.send({
            cmd: "start",
            fieldID,
        });
    }

    /**
     * Ends the currently running match on the given field
     * @param fieldID Field ID to end the match on
     * @returns success if the message send was successful, false if there was an error
     **/
    endMatchEarly(fieldID: number): Promise<APIResult<void>> {
        return this.send({
            cmd: "endEarly",
            fieldID,
        });
    }

    /**
     * Aborts the currently running match on the given field
     * @param fieldID Field ID to abort the match on
     * @returns success if the message send was successful, false if there was an error
     **/
    abortMatch(fieldID: number): Promise<APIResult<void>> {
        return this.send({
            cmd: "abort",
            fieldID,
        });
    }

    /**
     * Resets the fieldset timer on the given field
     * @param fieldID Field ID to reset the timer on
     * @returns success if the message send was successful, false if there was an error
     **/
    resetTimer(fieldID: number): Promise<APIResult<void>> {
        return this.send({
            cmd: "reset",
            fieldID,
        });
    }

    /**
     * Queues the previous match in this particular round
     * @returns success if the message send was successful, false if there was an error
     **/
    queuePreviousMatch(): Promise<APIResult<void>> {
        return this.send({
            cmd: "queuePrevMatch",
        });
    }

    /**
     * Queues the next match in this particular round
     * @returns success if the message send was successful, false if there was an error
     **/
    queueNextMatch(): Promise<APIResult<void>> {
        return this.send({
            cmd: "queueNextMatch",
        });
    }

    /**
     * Queues a Skills match on the fieldset
     * @param skillsID Skills type to queue
     * @returns success if the message send was successful, false if there was an error
     **/
    queueSkills(skillsID: FieldsetQueueSkillsType): Promise<APIResult<void>> {
        return this.send({
            cmd: "queueSkills",
            skillsID,
        });
    }

    /**
     * Updates the audience display for this fieldset
     * @param display The display mode to set
     * @returns success if the message send was successful, false if there was an error
     **/
    setAudienceDisplay(
        display: FieldsetAudienceDisplay
    ): Promise<APIResult<void>> {
        return this.send({
            cmd: "setAudienceDisplay",
            display,
        });
    }
}

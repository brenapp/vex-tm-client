import { APIResult, Client, TMErrors } from "./Client";
import { MatchTuple } from "./Division";
import WebSocket from "ws";
import EventEmitter from "events";

export type Field = {
    id: number;
    name: string;
}

export type FieldsetData = {
    id: number;
    name: string;
};

// Events
export type FieldsetEventFieldMatchAssigned = {
    readonly type: "fieldMatchAssigned";
    fieldID: number;
    match: MatchTuple;
}

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
};

export type FieldsetEventAudienceDisplayChanged = {
    type: "audienceDisplayChanged";
    display: FieldsetAudienceDisplay;
};

export type FieldsetEvent =
    FieldsetEventFieldMatchAssigned |
    FieldsetEventFieldActivated |
    FieldsetEventMatchStarted |
    FieldsetEventMatchStopped |
    FieldsetEventAudienceDisplayChanged;

export type FieldsetEventTypes = FieldsetEvent["type"];

// Commands
export type FieldsetCommandStartMatch = {
    cmd: "start";
    fieldID: number;
};

export type FieldsetCommandEndMatchEarly = {
    cmd: "endEarly";
    fieldID: number;
}

export type FieldsetCommandAbortMatch = {
    cmd: "abort";
    fieldID: number;
}

export type FieldsetCommandResetTimer = {
    cmd: "reset";
    fieldID: number;
}

export type FieldsetCommandQueuePreviousMatch = {
    cmd: "queuePreviousMatch";
}

export type FieldsetCommandQueueNextMatch = {
    cmd: "queueNextMatch";
}

export enum FieldsetQueueSkillsType {
    Programming = 1,
    Driver = 2,
}

export type FieldsetCommandQueueSkills = {
    cmd: "queueSkills";
    skillsID: FieldsetQueueSkillsType;
}

export type FieldsetCommandSetAudienceDisplay = {
    cmd: "setAudienceDisplay";
    display: FieldsetAudienceDisplay;
};

export type FieldsetCommand =
    FieldsetCommandStartMatch |
    FieldsetCommandEndMatchEarly |
    FieldsetCommandAbortMatch |
    FieldsetCommandResetTimer |
    FieldsetCommandQueuePreviousMatch |
    FieldsetCommandQueueNextMatch |
    FieldsetCommandQueueSkills |
    FieldsetCommandSetAudienceDisplay;

export type FieldsetCommandTypes = FieldsetCommand["cmd"];

export type FieldsetEvents = {
    [K in FieldsetEventTypes]: (event: Extract<FieldsetEvent, { type: K }>) => void;
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

    constructor(client: Client, data: FieldsetData) {
        super();
        this.id = data.id;
        this.name = data.name;
        this.client = client;
    };

    /**
     * Gets the fields associated with this fieldset
     * @returns Fields if successful, error if not
     **/
    getFields(): Promise<APIResult<Field[]>> {
        return this.client.get<{ fields: Field[] }>(`/api/fieldsets/${this.id}/fields`).then(result => {
            if (result.success) {
                return {
                    ...result,
                    data: result.data.fields
                };
            } else {
                return result;
            }
        });
    }

    /**
     * Connects to the fieldset
     * @returns API result, success is true if the connection was successful, false if there was an error
     **/
    async connect(): Promise<APIResult<WebSocket>> {

        const path = new URL(`/api/fieldsets/${this.id}`, this.client.connectionArgs.address);
        path.protocol = "ws";

        const result = await this.client.ensureBearer();
        if (!result.success) {
            return {
                success: false,
                error: result.error
            };
        }

        const token = result.token.access_token;

        try {
            const socket = new WebSocket(path, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            return new Promise((resolve) => {

                socket.addEventListener("open", () => {
                    this.websocket = socket;
                    resolve({
                        success: true,
                        data: socket,
                        cached: false
                    });
                });

                socket.addEventListener("error", (e) => {
                    resolve({
                        success: false,
                        error: TMErrors.WebSocketError,
                        error_details: e
                    });
                });

                socket.addEventListener("message", (event) => {
                    const data = JSON.parse(event.data) as FieldsetEvent;
                    this.emit(data.type, data);
                });

            });
        } catch (e) {
            return {
                success: false,
                error: TMErrors.WebSocketInvalidURL,
                error_details: e
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
        console.log("TM <== Switcher", command);

        try {
            return new Promise((resolve) => {
                if (!this.websocket) {
                    resolve({
                        success: false,
                        error: TMErrors.WebSocketClosed
                    });
                } else {
                    this.websocket.send(body, (error) => {
                        if (error) {
                            resolve({
                                success: false,
                                error: TMErrors.WebSocketError,
                                error_details: error
                            });
                        } else {
                            resolve({
                                success: true,
                                data: undefined,
                                cached: false
                            });
                        }
                    });
                }
            });
        } catch (e) {
            return {
                success: false,
                error: TMErrors.WebSocketClosed,
                error_details: e
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
            fieldID
        });
    };

    /**
     * Ends the currently running match on the given field
     * @param fieldID Field ID to end the match on
     * @returns success if the message send was successful, false if there was an error
     **/
    endMatchEarly(fieldID: number): Promise<APIResult<void>> {
        return this.send({
            cmd: "endEarly",
            fieldID
        });
    };

    /**
     * Aborts the currently running match on the given field
     * @param fieldID Field ID to abort the match on
     * @returns success if the message send was successful, false if there was an error
     **/
    abortMatch(fieldID: number): Promise<APIResult<void>> {
        return this.send({
            cmd: "abort",
            fieldID
        });
    };

    /**
     * Resets the fieldset timer on the given field
     * @param fieldID Field ID to reset the timer on
     * @returns success if the message send was successful, false if there was an error
     **/
    resetTimer(fieldID: number): Promise<APIResult<void>> {
        return this.send({
            cmd: "reset",
            fieldID
        });
    };

    /**
     * Queues the previous match in this particular round
     * @returns success if the message send was successful, false if there was an error
     **/
    queuePreviousMatch(): Promise<APIResult<void>> {
        return this.send({
            cmd: "queuePreviousMatch"
        });
    };

    /**
     * Queues the next match in this particular round
     * @returns success if the message send was successful, false if there was an error
     **/
    queueNextMatch(): Promise<APIResult<void>> {
        return this.send({
            cmd: "queueNextMatch"
        });
    };

    /**
     * Queues a Skills match on the fieldset
     * @param skillsID Skills type to queue
     * @returns success if the message send was successful, false if there was an error 
     **/
    queueSkills(skillsID: FieldsetQueueSkillsType): Promise<APIResult<void>> {
        return this.send({
            cmd: "queueSkills",
            skillsID
        });
    };

    /**
     * Updates the audience display for this fieldset
     * @param display The display mode to set
     * @returns success if the message send was successful, false if there was an error
     **/
    setAudienceDisplay(display: FieldsetAudienceDisplay): Promise<APIResult<void>> {
        return this.send({
            cmd: "setAudienceDisplay",
            display
        });
    };

}
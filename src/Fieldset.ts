import { APIResult, Client, TMErrors } from "./Client";
import { MatchTuple } from "./Division";
import WebSocket from "ws";

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
    Blank = "Blank",
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

export type FieldsetEventCallbackArgs = {
    [K in FieldsetEventTypes]: (event: CustomEvent<Extract<FieldsetEvent, { type: K }>>) => void;
}

export type FieldsetEventCallback<E extends FieldsetEventTypes> = FieldsetEventCallbackArgs[E] | {
    handleEvent(event: CustomEvent<Extract<FieldsetEvent, { type: E }>>): void;
};

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
    cmd: "setScreen";
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

export class Fieldset implements FieldsetData, EventTarget {

    id: number;
    name: string;

    client: Client;
    websocket: WebSocket | null = null;

    events: EventTarget = new EventTarget();

    constructor(client: Client, data: FieldsetData) {
        this.id = data.id;
        this.name = data.name;
        this.client = client;
    };

    /**
     * Gets the fields associated with this fieldset
     * @returns Fields if successful, error if not
     */
    getFields(): Promise<APIResult<Field[]>> {
        return this.client.get<{ fields: Field[] }>(`/api/fieldsets/${this.id}/fields`).then(result => {
            if (result.success) {
                return {
                    success: true,
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
     */
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
                        data: socket
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
                    this.dispatchEvent(new CustomEvent(data.type, { detail: data }));
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
     */
    async send(command: FieldsetCommand): Promise<APIResult<void>> {

        try {
            return new Promise((resolve) => {

                if (!this.websocket) {
                    resolve({
                        success: false,
                        error: TMErrors.WebSocketClosed
                    });
                } else {
                    this.websocket.send(JSON.stringify(command), (error) => {
                        if (error) {
                            resolve({
                                success: false,
                                error: TMErrors.WebSocketError,
                                error_details: error
                            });
                        } else {
                            resolve({
                                success: true,
                                data: undefined
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
     * Adds a listener for the specified fieldset event 
     * @param type Event Type
     * @param callback Callback Handler
     * @param options Event Listener Options
     **/
    addEventListener<E extends FieldsetEventTypes>(type: E, callback: FieldsetEventCallback<E> | null, options?: boolean | AddEventListenerOptions | undefined): void {
        return this.events.addEventListener(type, callback as EventListenerOrEventListenerObject | null, options);
    }

    /**
     * Removes a listener for the specified fieldset event
     * @param type Event Type
     * @param callback Callback Handler
     * @param options Event Listener Options
     **/
    removeEventListener<E extends FieldsetEventTypes>(type: E, callback: FieldsetEventCallback<E> | null, options?: boolean | EventListenerOptions | undefined): void {
        return this.events.removeEventListener(type, callback as EventListenerOrEventListenerObject | null, options);
    }

    /**
     * (Private) Dispatches an event
     * @param event CustomEvent
     * @returns boolean
     **/
    dispatchEvent(event: Event): boolean {
        return this.events.dispatchEvent(event);
    }

}
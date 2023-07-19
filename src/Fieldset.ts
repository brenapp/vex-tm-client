import Client from "./Client";
import WebSocket from "ws";
import EventEmitter from "events";
import * as protobuf from "protobufjs";
import * as path from "path";

export type V3MatchTupleRound =
    | "NONE"
    | "PRACTICE"
    | "QUAL"
    | "QF"
    | "SF"
    | "F"
    | "R16"
    | "R32"
    | "R64"
    | "R128"
    | "TOP_N"
    | "ROUND_ROBIN"
    | "SKILLS"
    | "TIMEOUT";

export type V3MatchTupleSkillsType = "NO_SKILLS" | "PROGRAMMING" | "DRIVER";

export type V3MatchTuple = {
    division?: number;
    round: V3MatchTupleRound;
    instance?: number;
    match?: number;
    session?: number;
};

type FieldSetNoticeID =
    | "NONE"
    | "MATCH_STARTED"
    | "MATCH_STOPPED"
    | "MATCH_PAUSED"
    | "MATCH_RESUMED"
    | "MATCH_ABORTED"
    | "TIME_UPDATED"
    | "TIMER_RESET"
    | "ASSIGN_FIELD_MATCH"
    | "ASSIGN_SAVED_MATCH"
    | "DISPLAY_UPDATED"
    | "MATCH_SCORE_UPDATED"
    | "AUTO_WINNER_UPDATED"
    | "FIELD_LIST"
    | "FIELD_ACTIVATED";

export type FieldSetNotice = {
    id: FieldSetNoticeID;
    field_id?: number;
    match?: V3MatchTuple;
    remaining?: number;
    fields?: Record<number, string>;
};

export type QueueMatchType =
    | "UNSET"
    | "REGULAR"
    | "DRIVER_SKILLS"
    | "AUTON_SKILLS";

export type FieldControlRequest =
    | "START_MATCH"
    | "END_EARLY"
    | "ABORT_MATCH"
    | "RESET_TIMER";

type FieldSetEvents = {
    message: (message: FieldSetNotice) => void;
    open: () => void;
    close: () => void;
} & {
        [K in FieldSetNoticeID]: (message: FieldSetNotice) => void;
    };

export default interface Fieldset {
    on<U extends keyof FieldSetEvents>(
        event: U,
        listener: FieldSetEvents[U]
    ): this;
    once<U extends keyof FieldSetEvents>(
        event: U,
        listener: FieldSetEvents[U]
    ): this;
    off<U extends keyof FieldSetEvents>(
        event: U,
        listener: FieldSetEvents[U]
    ): this;
}

/**
 * Represents an event Field Set
 **/
export default class Fieldset extends EventEmitter {
    id: number;
    name: string = "";

    client: Client;
    ws: WebSocket;
    fields: Record<number, string> = {};

    static proto: protobuf.Root | undefined = undefined;
    static FieldSetNotice: protobuf.Type;
    static FieldSets: protobuf.Type;
    static FieldSetRequest: protobuf.Type;
    static FieldControlRequest: protobuf.Type;
    static SetActiveFieldRequest: protobuf.Type;

    /**
     * Thanks to John Holbrook for helping to figure out the handshake
     *
     *      https://gist.github.com/johnholbrook/6c5923ed892648e71c817a859d702f73
     *
     * The handshake is a 128 byte payload:
     * - 7 bytes of padding (content irrelevant)
     * - Current UNIX timestamp in seconds since epoch (little-endian). Must be within 300s of TM server's time for handshake to be accepted.
     * - 117 bytes of padding (content irrelevant)
     *
     **/
    sendHandshake() {
        const now = Math.floor(Date.now() / 1000).toString(16);

        // Encode the timestamp in little-endian into the buffer
        const buffer = new Uint8Array(128);
        buffer[7] = parseInt(now.slice(6, 8), 16);
        buffer[8] = parseInt(now.slice(4, 6), 16);
        buffer[9] = parseInt(now.slice(2, 4), 16);
        buffer[10] = parseInt(now.slice(0, 2), 16);

        // Send the buffer
        this.ws.send(buffer);
    }

    async getFields() {
        if (Object.keys(this.fields).length > 1) {
            return Promise.resolve(this.fields);
        }

        return new Promise<Record<number, string>>((resolve, reject) => {
            const handler = (message: FieldSetNotice) => {
                this.fields = message.fields!;
                this.off("FIELD_LIST", handler);
                return resolve(this.fields);
            };
            this.on("FIELD_LIST", handler);
        });
    }

    /**
     * Sets the "active" field in the fieldset
     * @param id The field ID
     */
    async setActiveField(fieldId: number) {
        const message = Fieldset.FieldSetRequest.create({ setActive: { fieldId } });
        return this.sendFieldControlRequest(message);
    }

    async queueMatch(type: QueueMatchType, fieldId: number) {
        const message = Fieldset.FieldSetRequest.create({
            queueMatch: {
                id: type,
            },
        });

        return this.sendFieldControlRequest(message);
    }

    async sendFieldControlRequest(message: protobuf.Message) {
        const buffer = Fieldset.FieldSetRequest.encode(message).finish();

        const mangled = Fieldset.mangleMessage(buffer);
        return new Promise<void>((resolve, reject) => {
            this.ws.send(mangled, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    constructor(client: Client, id: number) {
        super();
        this.id = id;
        this.client = client;

        // Create the websocket connection
        const url = new URL(client.address);
        url.protocol = "ws";
        url.pathname = `/fieldsets/${this.id}`;

        this.ws = new WebSocket(url, { headers: { Cookie: client.cookie } });

        Fieldset.loadProtobuf();

        // Send handshake when the connection opens
        this.ws.addEventListener("open", () => {
            this.sendHandshake();
            this.emit("open");
        });
        this.ws.addEventListener("message", (event) => {
            const encoded = Fieldset.unmangleMessage(event.data);
            const message = Fieldset.FieldSetNotice.decode(
                encoded
            ).toJSON() as FieldSetNotice;
            this.emit("message", message);
            this.emit(message.id, message);
        });

        this.getFields();
    }

    /**
     * Unmangles messages from the websocket
     * @param data Buffer received from TM websocket
     * @returns
     */
    static unmangleMessage(data: Uint8Array) {
        const magic = data[0] ^ 0xe5;
        const raw = data.slice(1).map((byte) => byte ^ magic);
        return raw;
    }

    static mangleMessage(data: Uint8Array) {
        const magic = 20; // this number is arbitrary
        const mangled = data.map((byte) => byte ^ magic);

        const buffer = new Uint8Array(mangled, 1);
        buffer[0] = magic ^ 0xe5;
        return buffer;
    }

    static async loadProtobuf() {
        return new Promise<void>((resolve, reject) => {
            if (Fieldset.proto) {
                resolve();
            }

            const proto = path.join(__dirname, "proto", "fieldset.proto");

            protobuf.load(proto, (err, root) => {
                Fieldset.proto = root;
                const fieldSetNotice = root?.lookupType("FieldSetNotice");

                if (!fieldSetNotice) {
                    reject(new Error("Cannot load protobuf FieldSetNotice"));
                } else {
                    Fieldset.FieldSetNotice = fieldSetNotice;
                }

                const fieldSets = root?.lookupType("FieldSets");

                if (!fieldSets) {
                    reject(new Error("Cannot load protobuf FieldSets"));
                } else {
                    Fieldset.FieldSets = fieldSets;
                }

                const fieldSetRequest = root?.lookupType("FieldSetRequest");
                if (!fieldSetRequest) {
                    reject(new Error("Cannot load protobuf FieldSetRequest"));
                } else {
                    Fieldset.FieldSetRequest = fieldSetRequest;
                }

                const fieldControlRequest = root?.lookupType("FieldControlRequest");
                if (!fieldControlRequest) {
                    reject(new Error("Cannot load protobuf SetActiveFieldRequest"));
                } else {
                    Fieldset.FieldControlRequest = fieldControlRequest;
                }

                const setActiveFieldRequest = root?.lookupType("SetActiveFieldRequest");
                if (!setActiveFieldRequest) {
                    reject(new Error("Cannot load protobuf SetActiveFieldRequest"));
                } else {
                    Fieldset.SetActiveFieldRequest = setActiveFieldRequest;
                }

                resolve();
            });
        });
    }

    static async getAll(client: Client): Promise<Fieldset[]> {
        await Fieldset.loadProtobuf();

        const buffer = await client
            .fetch("/fieldsets")
            .then((response) => response.arrayBuffer())
            .then((buffer) => new Uint8Array(buffer));

        const response = Fieldset.FieldSets.decode(
            buffer,
            buffer.length
        ).toJSON() as { fieldSets: Record<number, string> };

        return Object.entries(response.fieldSets).map(([id, name]) => {
            const fieldset = new Fieldset(client, Number.parseInt(id));
            fieldset.name = name;
            return fieldset;
        });
    }
}

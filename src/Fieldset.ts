import Client from "./Client";
import WebSocket from "ws";
import EventEmitter from "events";
import * as protobuf from "protobufjs";

export type V3MatchTupleRound = "NONE" |
    "PRACTICE" |
    "QUAL" |
    "QF" |
    "SF" |
    "F" |
    "R16" |
    "R32" |
    "R64" |
    "R128" |
    "TOP_N" |
    "ROUND_ROBIN" |
    "SKILLS" |
    "TIMEOUT"

export type V3MatchTupleSkillsType = "NO_SKILLS" | "PROGRAMMING" | "DRIVER";

export type V3MatchTuple = {
    division?: number
    round: V3MatchTupleRound;
    instance?: number;
    match?: number;
    session?: number;
};

type FieldSetNoticeID =
    "NONE" |
    "MATCH_STARTED" |
    "MATCH_STOPPED" |
    "MATCH_PAUSED" |
    "MATCH_RESUMED" |
    "MATCH_ABORTED" |
    "TIME_UPDATED" |
    "TIMER_RESET" |
    "ASSIGN_FIELD_MATCH" |
    "ASSIGN_SAVED_MATCH" |
    "DISPLAY_UPDATED" |
    "MATCH_SCORE_UPDATED" |
    "AUTO_WINNER_UPDATED" |
    "FIELD_LIST" |
    "FIELD_ACTIVATED"

export type FieldSetNotice = {
    id: FieldSetNoticeID,
    field_id?: number,
    match?: V3MatchTuple,
    remaining?: number,
    fields?: Record<number, string>
};


type FieldSetEvents = {
    message: (message: FieldSetNotice) => void;
    open: () => void;
    close: () => void;
} & {
        [K in FieldSetNoticeID]: (message: FieldSetNotice) => void;
    }

export default interface Fieldset {
    on<U extends keyof FieldSetEvents>(event: U, listener: FieldSetEvents[U]): this;
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
    };

    /**
     * 
     * @param data Buffer received from TM websocket
     * @returns 
     */
    decodeMessage(data: Buffer) {
        const magic = data[0] ^ 0xE5;
        const raw = data.slice(1).map(byte => byte ^ magic);
        return Fieldset.FieldSetNotice.decode(raw, raw.length);
    }

    constructor(client: Client, id: number) {
        super()
        this.id = id;
        this.client = client;

        // Create the websocket connection
        const url = new URL(client.address);
        url.protocol = "ws";
        url.pathname = `/fieldsets/${this.id}`;

        this.ws = new WebSocket(url, { headers: { "Cookie": client.cookie } });

        // Parse the protobuf
        if (!Fieldset.proto) {
            protobuf.load("./proto/fieldset.proto", (err, root) => {
                Fieldset.proto = root;
                const type = root?.lookupType("FieldSetNotice");
                if (!type) {
                    throw new Error("Cannot load protobufs");
                };
                Fieldset.FieldSetNotice = type;
            });
        };

        // Send handshake when the connection opens
        this.ws.addEventListener("open", () => {
            this.sendHandshake();
            this.emit("open");
        });
        this.ws.addEventListener("message", event => {
            const message = this.decodeMessage(event.data).toJSON() as FieldSetNotice;
            this.emit("message", message);
            this.emit(message.id, message);
        });

        this.on("FIELD_LIST", ({ fields }) => {
            if (fields) this.fields = fields;
        })
    }
}
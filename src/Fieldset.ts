import Client from "./Client";
import WebSocket from "ws";
import { parse } from "url";


/**
 * Represents an event Field Set
 */

export interface Field {
    id: number;
    name: string;
}

export enum FieldsetType {
    COMPETITION = 1,
    SKILLS = 2
}

export interface SkillsFieldsetState {
    state: "DISABLED" | "DRIVER" | "PROGRAMMING"
}

export interface CompetitionFieldsetState {
    fieldId: number,
    match: string;
    state: "DISABLED" | "DRIVER" | "PROGRAMMING"
}

export default class Fieldset {

    type: FieldsetType = 1;
    id: number;
    name: string = "";
    fields: Field[] = [];

    client: Client;
    ws: WebSocket;


    // State Data
    state: "DISABLED" | "DRIVER" | "PROGRAMMING" = "DISABLED";

    constructor(client: Client, id: number) {
        this.id = id;
        this.client = client;

        // Create the websocket connection
        this.ws = new WebSocket(`ws://${parse(client.address).hostname}/fieldsets/${this.id} `, { headers: { "Cookie": client.cookie } });

        // Handle messages
        this.ws.on("message", data => {
        });
    }

    /**
     * Queues a match on the fieldset
     */
    queue(match: "Programming" | "Driving" | "PrevMatch" | "Nextmatch") {
        this.ws.send(JSON.stringify({
            action: `queue${match}`
        }));
    }

    /**
     * Starts the queued match on the specified field
     */
    start(fieldId: number) {
        this.ws.send(JSON.stringify({
            action: "start",
            fieldId
        }))
    }

    /**
     * Aborts a match on the specified field
     */
    abort(fieldId: number) {
        this.ws.send(JSON.stringify({
            action: "abort",
            fieldId
        }))
    }

    /**
     * Resets the match on the specified field
     */
    reset(fieldId: number) {
        this.ws.send(JSON.stringify({
            action: "reset",
            fieldId
        }))
    }

    async refresh(): Promise<Fieldset> {
        const response = await this.client.fetch(`/fieldsets/${this.id}/fields`).then(r => r.json());
        this.fields = response.fields;

        return this;
    }

    static async getAll(client: Client) {
        const fieldsets: Promise<Fieldset>[] = [];
        const sets = await client.fetch("/fieldsets").then(resp => resp.json()).then(fs => fs.fieldSets);

        sets.map(({ id, type, name }: { id: number, type: number, name: string }) => {
            const fieldset = new Fieldset(client, id);
            fieldset.name = name;
            fieldset.type = type;
            fieldsets.push(fieldset.refresh());
        });

        return Promise.all(fieldsets);
    }

}
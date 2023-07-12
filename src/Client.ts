import Division from "./Division";
import Fieldset from "./Fieldset";
import cheerio from "cheerio"

/**
 * Represents a single connection of a certain type to a TM server
 */
export enum AuthenticatedRole {
    ADMINISTRATOR = "admin",
    SCOREKEEPER = "scorekeeper",
    INSPECTOR = "inspector",
    JUDGE = "judge"
}

export interface TeamSkill {

    rank: number;

    number: string;
    name: string;

    score: number;

    programming: {
        high_score: number;
        attempts: number;
    };

    driving: {
        high_score: number;
        attempts: number;
    }

};

export default class Client {

    // Connection data
    address: string = "http://localhost";
    role: AuthenticatedRole = AuthenticatedRole.ADMINISTRATOR;
    password: string = "";
    cookie: string = "";


    // Tournament Data
    divisions: Division[] = [];
    fieldsets: Fieldset[] = [];

    /**
     * Constructs a client connection to tournament manager
     * @param address The IP Address of Tournament Manager
     * @param role The role you are connecting as
     * @param password The password for the specified role
     */
    constructor(address: string, role: AuthenticatedRole, password: string) {
        this.address = address;
        this.role = role;
        this.password = password;
    }

    /**
     * Injects the authentication cookie into a request
     * @param path Path to request
     * @param params Fetch parameters
     */
    async fetch(path: string, params: RequestInit = {}) {

        const url = new URL(this.address);
        url.pathname = path;


        return fetch(
            url,
            {
                redirect: "manual",
                headers: {
                    "Cookie": this.cookie
                },
                ...params
            }
        );
    }

    /** 
     * Connects to TM manager, also parses a list of divisions
     **/
    async connect() {

        const url = new URL(this.address);
        url.pathname = "/admin/login";

        const response = await fetch(url, {
            method: "POST",
            redirect: "manual",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Cache-Control": "no-cache",
            },
            body: `user=${this.role}&password=${this.password}&submit=`,
        });

        // If the response is 200 then the credentials are incorrect, credentials are correct for 302 redirect
        if (response.status == 200) {
            throw new Error("Credentials rejected by Tournament Manager");
        }

        // Set the authentication cookie
        if (response.headers.has("set-cookie")) {
            this.cookie = response.headers.get("Set-Cookie") as string;
        } else {
            throw new Error("Tournament Manager did not grant cookie")
        }

        // Get divisions and fieldsets
        this.divisions = await Division.getAll(this);
        this.fieldsets = await Fieldset.getAll(this);
    }

    /**
     * Gets current skills rankings
     */
    async getSkills() {

        const skills: TeamSkill[] = [];

        // Get skills ranking page
        const $ = await this.fetch("/skills/rankings")
            .then(resp => resp.text())
            .then(html => cheerio.load(html));

        // Convert to array, and then parse
        const records = $("table tbody tr").toArray();

        for (const row of records) {
            const skill: TeamSkill = {
                rank: parseInt($(row).children("td:nth-child(1)").text()),
                number: $(row).children("td:nth-child(2)").text(),
                name: $(row).children("td:nth-child(3)").text(),
                score: parseInt($(row).children("td:nth-child(4)").text()),
                programming: {
                    high_score: parseInt($(row).children("td:nth-child(5)").text()),
                    attempts: parseInt($(row).children("td:nth-child(6)").text())
                },
                driving: {
                    high_score: parseInt($(row).children("td:nth-child(7)").text()),
                    attempts: parseInt($(row).children("td:nth-child(8)").text())
                }
            };

            skills.push(skill);
        };

        return skills;
    };
}
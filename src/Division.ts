/**
 * Represents a division at an event
 */

import Client from "./Client";
import cheerio from "cheerio"


export interface Team {
    number: string;
    name: string;
    location: string;
    school: string;
}

export default class Division {

    name: string;
    id: number;
    client: Client;

    teams: Team[] = [];

    constructor(client: Client, id: number) {
        this.id = id;
        this.name = `Division ${id}`;
        this.client = client;
    }

    // Populates a division list for a specific tournament
    static async getAll(client: Client) {
        const divisions: Promise<Division>[] = [];
        const $ = await client.fetch("/division1/teams")
            .then(resp => resp.text())
            .then(html => cheerio.load(html));


        $("ul li:first-child ul.dropdown-menu").children().each((index, element) => {
            const div = new Division(client, index + 1);
            divisions.push(div.refresh());
        });

        return Promise.all(divisions);
    }

    /**
     * Needs to be called initally
     */
    async refresh(): Promise<Division> {

        // Gets team list and division name
        const $ = await this.client.fetch(`/division${this.id}/teams`)
            .then(resp => resp.text())
            .then(html => cheerio.load(html));

        this.name = $("small").text();

        // Populate the teams
        $("table tbody tr").each((index, element) => {
            const [, number, , name, , location, , school] = (element as cheerio.TagElement).children.map(c => $(c).text());
            this.teams.push({
                number,
                name,
                location,
                school
            })
        });

        return this;
    }


}
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

export interface Match {
    name: string;
    redTeams: string[];
    blueTeams: string[];
    redScore: number;
    blueScore: number;
};

export interface Ranking {
    rank: number;
    team: string;
    teamName: string;
    wp: number;
    ap: number;
    sp: number;
    wlt: string;
};

export default class Division {

    name: string;
    id: number;
    client: Client;

    teams: Team[] = [];
    matches: Match[] = [];
    rankings: Ranking[] = [];

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
        const $teams = await this.client.fetch(`/division${this.id}/teams`)
            .then(resp => resp.text())
            .then(html => cheerio.load(html));

        this.name = $teams("small").text();

        this.matches = [];
        this.teams = [];
        this.rankings = [];

        // Populate the teams
        $teams("table tbody tr").each((index, element) => {
            const [, number, , name, , location, , school] = (element as cheerio.TagElement).children.map(c => $teams(c).text());
            this.teams.push({
                number,
                name,
                location,
                school
            })
        });

        // Populate the matches
        const $matches = await this.client.fetch(`/division${this.id}/matches`)
            .then(resp => resp.text())
            .then(html => cheerio.load(html));


        $matches("table tbody tr").each((index, element) => {
            const columns = (element as cheerio.TagElement).children.map(c => [$matches(c).text().trim(), $matches(c).attr("class")]).filter(([c]) => c != "");

            const name = columns[0][0] ?? "";
            const teams = columns.slice(1, columns.length - 2);

            const redTeams = teams.filter(([, className]) => className?.includes("red")).map(([team]) => team ?? "");
            const blueTeams = teams.filter(([, className]) => className?.includes("blue")).map(([team]) => team ?? "");

            const blueScore = parseInt((columns[columns.length - 1][0] ?? ""));
            const redScore = parseInt((columns[columns.length - 2][0]) ?? "");

            this.matches.push({ name, redTeams, blueTeams, blueScore, redScore });
        });

        const $rankings = await this.client.fetch(`/division${this.id}/rankings`)
            .then(resp => resp.text())
            .then(html => cheerio.load(html));


        $rankings("table tbody tr").each((index, element) => {
            const columns = (element as cheerio.TagElement).children.map(c => $rankings(c).text().trim()).filter((c => c != ""));

            const rank = parseInt(columns[0] ?? "");
            const team = columns[1] ?? "";
            const teamName = columns[2] ?? "";
            const wp = parseFloat(columns[3] ?? "");
            const ap = parseFloat(columns[4] ?? "");
            const sp = parseFloat(columns[5] ?? "");
            const wlt = columns[6] ?? "";

            this.rankings.push({ rank, team, teamName, wp, ap, sp, wlt });
        });

        return this;
    }

}
import { APIResult, Client } from "./Client.js";
import { Team } from "./Team.js";
import { Match, MatchRound } from "./Match.js";
import { Ranking } from "./Ranking.js";

export type DivisionData = {
    id: number;
    name: string;
};

export class Division implements DivisionData {
    id: number;
    name: string;

    client: Client;

    constructor(client: Client, data: DivisionData) {
        this.id = data.id;
        this.name = data.name;
        this.client = client;
    }

    /**
     * Gets the teams in this division
     * @returns Teams if successful, error if not
     **/
    async getTeams(): Promise<APIResult<Team[]>> {
        return this.client
            .get<{ teams: Team[] }>(`/api/teams/${this.id}`)
            .then((result) => {
                if (!result.success) {
                    return result;
                }

                return {
                    ...result,
                    data: result.data.teams,
                };
            });
    }

    /**
     * Gets the matches in this division
     * @returns Matches if successful, error if not
     **/
    async getMatches(): Promise<APIResult<Match[]>> {
        return this.client
            .get<{ matches: Match[] }>(`/api/matches/${this.id}`)
            .then((result) => {
                if (!result.success) {
                    return result;
                }

                return {
                    ...result,
                    data: result.data.matches,
                };
            });
    }

    /**
     * Fetches rankings for this division for the particular round.
     *
     * @param round Round to get rankings for, typically MatchRound.Qualification or MatchRound.TopN
     * (for IQ finalist rankings)
     * @returns The rankings array
     **/
    async getRankings(round: MatchRound): Promise<APIResult<Ranking[]>> {
        return this.client
            .get<{ rankings: Ranking[] }>(`/api/rankings/${this.id}/${round}`)
            .then((result) => {
                if (!result.success) {
                    return result;
                }

                return {
                    ...result,
                    data: result.data.rankings,
                };
            });
    }
}

import { APIResult, Client } from "./Client";
import { Team } from "./Team";

export enum MatchState {
    Unplayed = "UNPLAYED",
    Scored = "SCORED",
}

export enum MatchRound {
    None = "NONE",
    Practice = "PRACTICE",
    Qualification = "QUAL",
    Quarterfinal = "QF",
    Semifinal = "SF",
    Final = "F",
    RoundOf16 = "R16",
    RoundOf32 = "R32",
    RoundOf64 = "R64",
    RoundOf128 = "R128",
    TopN = "TOP_N",
    RoundRobin = "ROUND_ROBIN",
    Skills = "SKILLS",
    Timeout = "TIMEOUT",
}

export type MatchAlliance = {
    teams: string[];
}

export type MatchTuple<R extends MatchRound = MatchRound> = {
    session: number;
    division: number;
    round: R;
    instance: number;
    match: number;
};

export type Match = {
    winningAlliance: number;
    finalScore: number[];
    matchInfo: {
        timeScheduled: number;
        state: MatchState;
        alliances: MatchAlliance[];
        matchTuple: MatchTuple<Exclude<MatchRound, MatchRound.None | MatchRound.Skills | MatchRound.Timeout>>;
    };
};

export type RankAlliance = {
    name: string;
    teams: { number: string; }[];
};

export type Ranking = {
    rank: number;
    tied: false;
    alliance: RankAlliance[];
    wins: number;
    losses: number;
    ties: number;
    wp: number;
    ap: number;
    sp: number;
    avgPoints: number;
    totalPoints: number;
    highScore: number;
    numMatches: number;
    minNumMatches: boolean;
};

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
    };

    /**
     * Gets the teams in this division
     * @returns Teams if successful, error if not
     */
    async getTeams(): Promise<APIResult<Team[]>> {
        return this.client.get<{ teams: Team[] }>(`/api/teams/${this.id}`).then(result => {
            if (!result.success) {
                return result;
            }

            return {
                success: true,
                data: result.data.teams
            };
        });
    };

    /**
     * Gets the matches in this division
     * @returns Matches if successful, error if not
     */
    async getMatches(): Promise<APIResult<Match[]>> {
        return this.client.get<{ matches: Match[] }>(`/api/matches/${this.id}`).then(result => {
            if (!result.success) {
                return result;
            }

            return {
                success: true,
                data: result.data.matches
            };
        });
    };

    /**
     * Fetches rankings for this division for the particular round.
     * 
     * @param round Round to get rankings for, typically MatchRound.Qualification or MatchRound.TopN
     * (for IQ finalist rankings)
     * @returns 
     */
    async getRankings(round: MatchRound): Promise<APIResult<Ranking[]>> {
        return this.client.get<{ rankings: Ranking[] }>(`/api/rankings/${this.id}/${round}`).then(result => {
            if (!result.success) {
                return result;
            }

            return {
                success: true,
                data: result.data.rankings
            };
        });
    };

}
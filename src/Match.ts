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
    teams: {
        number: string;
    }[];
};

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
        matchTuple: MatchTuple<
            Exclude<
                MatchRound,
                MatchRound.None | MatchRound.Skills | MatchRound.Timeout
            >
        >;
    };
};

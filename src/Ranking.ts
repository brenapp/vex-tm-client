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

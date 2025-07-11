export enum AgeGroup {
    HighSchool = "HIGH_SCHOOL",
    MiddleSchool = "MIDDLE_SCHOOL",
    ElementarySchool = "ELEMENTARY_SCHOOL",
    College = "COLLEGE",
}

export type Team = {
    number: string;
    name: string;

    /**
     * @deprecated This field may be remove in a future version of TM
     **/
    shortName: string;

    /**
     * @deprecated This field may be remove in a future version of TM
     */
    sponsors: string;

    city: string;
    state: string;
    country: string;

    ageGroup: AgeGroup;
    divId: number;
    checkedIn: boolean;
};

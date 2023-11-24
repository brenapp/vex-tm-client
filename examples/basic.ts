import { Client, FieldsetAudienceDisplay, FieldsetQueueSkillsType, MatchRound } from "vex-tm-client";
import authorization from "./credentials.json"

(async function () {

    const client = new Client({
        address: "http://localhost",
        authorization: {
            client_id: authorization.client_id,
            client_secret: authorization.client_secret,
            grant_type: "client_credentials",
            expiration_date: authorization.expiration_date
        }
    });

    const result = await client.connect();
    if (!result.success) {
        console.error("client", result);
        return;
    }

    const divisions = await client.getDivisions();
    if (!divisions.success) {
        console.error("divisions", divisions);
        return;
    }

    console.log(divisions);

    const division = divisions.data[0];

    const teams = await division.getTeams();
    if (!teams.success) {
        console.error("teams", teams);
        return;
    }

    console.log(teams);

    const matches = await division.getMatches();
    if (!matches.success) {
        console.error("matches", matches);
        return;
    }

    for (const match of matches.data) {
        console.log(match);
    }

    const rankings = await division.getRankings(MatchRound.Qualification);
    if (!rankings.success) {
        console.error("rankings", rankings);
        return;
    }

    console.log(rankings);

    const fieldsets = await client.getFieldsets();
    if (!fieldsets.success) {
        console.error("fieldsets", fieldsets);
        return;
    }

    console.log(fieldsets);

    const fieldset = fieldsets.data[0];
    const fields = await fieldset.getFields();
    if (!fields.success) {
        console.error("fields", fields);
        return;
    }

    console.log(fields.data);

    const connection = await fieldset.connect();
    if (!connection.success) {
        console.error("connection", connection);
        return;
    }

    fieldset.on("matchStarted", event => console.log(event));
    fieldset.on("matchStopped", event => console.log(event));
    fieldset.on("fieldActivated", event => console.log(event));
    fieldset.on("fieldMatchAssigned", event => console.log(event));
    fieldset.on("audienceDisplayChanged", event => console.log(event));

    await fieldset.queueSkills(FieldsetQueueSkillsType.Driver);
    await fieldset.startMatch(1);

    fieldset.on("matchStopped", async event => {
        await fieldset.setAudienceDisplay(FieldsetAudienceDisplay.SkillsRankings);
    });

    process.on("exit", () => {
        fieldset.disconnect();
    })

})();
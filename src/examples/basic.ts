import * as TM from "../Client";
import { MatchRound } from "../Division";
import { FieldsetQueueSkillsType } from "../Fieldset";
import authorization from "./credentials.json"

(async function () {

    const client = new TM.Client({
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

    fieldset.addEventListener("matchStarted", event => console.log(event.detail));
    fieldset.addEventListener("matchStopped", event => console.log(event.detail));
    fieldset.addEventListener("fieldActivated", event => console.log(event.detail));
    fieldset.addEventListener("fieldMatchAssigned", event => console.log(event.detail));
    fieldset.addEventListener("audienceDisplayChanged", event => console.log(event.detail));

    await fieldset.send({
        cmd: "queueSkills",
        skillsID: FieldsetQueueSkillsType.Driver
    });

    await fieldset.send({
        cmd: "start",
        fieldID: 1
    })

    process.on("exit", () => {
        fieldset.disconnect();
    })

})();
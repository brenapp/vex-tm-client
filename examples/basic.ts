import { Client, MatchRound } from "vex-tm-client"
import authorization from "./credentials.json"

(async function () {

    const client = new Client({
        address: "http://192.168.1.63",
        authorization: {
            client_id: authorization.client_id,
            client_secret: authorization.client_secret,
            grant_type: "client_credentials",
            expiration_date: authorization.expiration_date
        },
        clientAPIKey: authorization.client_api_key
    });

    const result = await client.connect();
    console.log(client.bearerToken);
    if (!result.success) {
        console.error("client", result);
        return;
    }
    const event = await client.getEventInfo();
    if (!event.success) {
        console.error("event", event);
        return;
    }

    console.log(event);


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

    const matches = await division.getMatches();
    if (!matches.success) {
        console.error("matches", matches);
        return;
    }
    const rankings = await division.getRankings(MatchRound.Qualification);
    if (!rankings.success) {
        console.error("rankings", rankings);
        return;
    }

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

})();
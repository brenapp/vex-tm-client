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
        },
        clientAPIKey: authorization.client_api_key
    });

    // Will only make one request to the server    
    for (let i = 0; i < 100; i++) {
        const start = performance.now();
        const teams = await client.getTeams();
        const end = performance.now();

        if (teams.success) {
            console.log(`Took ${end - start}ms to fetch ${teams.data.length} teams (cached: ${teams.cached})`);
        } else {
            console.error(teams);
        }

    };

})();
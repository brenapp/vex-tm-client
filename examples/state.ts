import { Client, FieldsetAudienceDisplay, FieldsetQueueSkillsType, MatchRound } from "vex-tm-client"
import authorization from "./credentials.json"
import { FieldsetEvent } from "../out/Fieldset";

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

    const result = await client.connect();
    if (!result.success) {
        console.error("client", result);
        return;
    }

    const fieldsets = await client.getFieldsets();
    if (!fieldsets.success) {
        console.error("fieldsets", fieldsets);
        return;
    }

    const fieldset = fieldsets.data[0];

    await fieldset.connect();

    fieldset.on("message", (e: FieldsetEvent) => {
        console.log(e, fieldset.state);
    });

})();
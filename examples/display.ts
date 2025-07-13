import { Client, FieldsetAudienceDisplay } from "vex-tm-client";
import authorization from "./credentials.json" with { type: "json" };

function timeout(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

(async function () {
    const client = new Client({
        address: "http://localhost",
        authorization: {
            client_id: authorization.client_id,
            client_secret: authorization.client_secret,
            grant_type: "client_credentials",
            expiration_date: authorization.expiration_date,
        },
        clientAPIKey: authorization.clientAPIKey,
    });

    const event = await client.get("/api/event");
    console.log(event);

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
    await timeout(2000);

    for (const mode of Object.values(FieldsetAudienceDisplay)) {
        await fieldset.setAudienceDisplay(mode);
        await timeout(2000);
    }
})();

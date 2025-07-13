import { Client } from "vex-tm-client";
import authorization from "./credentials.json" with { type: "json" };

(async function () {

    const clientA = new Client({
        address: "http://127.0.0.1",
        authorization: {
            client_id: authorization.client_id,
            client_secret: authorization.client_secret,
            grant_type: "client_credentials",
            expiration_date: authorization.expiration_date,
        },
        clientAPIKey: authorization.clientAPIKey,
    });

    const clientB = new Client({
        address: "http://127.0.0.1",
        manualAuthorization: {
            getBearer: async () => {
                const bearer = await clientA.getBearer()
                console.log(bearer);
                return bearer;
            }
        },
        clientAPIKey: authorization.clientAPIKey,
    })

    const result = await clientB.connect();
    console.log(clientB.bearerToken);
    if (!result.success) {
        console.error("client", result);
        return;
    }
    const event = await clientB.getEventInfo();
    if (!event.success) {
        console.error("event", event);
        return;
    }

    console.log(event);
})();

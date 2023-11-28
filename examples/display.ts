import { Client, FieldsetAudienceDisplay, FieldsetQueueSkillsType } from "vex-tm-client";
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

    await fieldset.queueSkills(FieldsetQueueSkillsType.Driver);
    await fieldset.startMatch(1);

    fieldset.websocket?.addEventListener("message", event => {
        console.log("TM ==> Switcher", JSON.parse(event.data));
    });

    fieldset.websocket?.addEventListener("close", event => {
        console.log("TM ==> Switcher", "Connection closed");
    });


    setTimeout(async () => {
        await fieldset.setAudienceDisplay(FieldsetAudienceDisplay.Blank);
    }, 2000);

})();
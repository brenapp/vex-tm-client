import Fieldset from "../Fieldset";
import Client, { AuthenticatedRole } from "../main";

const client = new Client("http://127.0.0.1", AuthenticatedRole.ADMINISTRATOR, "hello");

(async function () {

    await client.connect();
    console.log("Connected to TM...");
    const fieldset = new Fieldset(client, 1);

    fieldset.on("FIELD_ACTIVATED", message => {
        console.log("Field activated!", message);
    });
    fieldset.on("MATCH_STARTED", message => {
        console.log("Match Started!", message);
    });
})();
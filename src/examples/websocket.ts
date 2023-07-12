import Fieldset from "../Fieldset";
import Client, { AuthenticatedRole } from "../main";

const client = new Client("http://127.0.0.1", AuthenticatedRole.ADMINISTRATOR, "hello");

(async function () {

    await client.connect();
    console.log("Connected to TM...");

    const fieldset = client.fieldsets[0];
    const fields = await fieldset.getFields();

    console.log(`${fieldset.name}:`);
    for (const [id, name] of Object.entries(fields)) {
        console.log(` - ${name}`);
    };

    fieldset.on("message", message => {
        console.log(message);
    });

})();
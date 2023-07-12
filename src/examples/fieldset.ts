import Client, { AuthenticatedRole } from "../main";

const client = new Client("http://127.0.0.1", AuthenticatedRole.ADMINISTRATOR, "hello");

(async function () {

    await client.connect();
    const fieldset = client.fieldsets[1];

    console.log(`Controlling fieldset ${fieldset.name}`);
    for (const [id, name] of Object.entries(fieldset.fields)) {
        console.log(`   Field ${id} is ${name}`);
    };

    fieldset.ws.on("message", data => console.log(JSON.parse(data.toString())));

})();
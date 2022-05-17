import Client, { AuthenticatedRole } from "../main";

const client = new Client("http://10.211.55.3", AuthenticatedRole.ADMINISTRATOR, "hello");

(async function() {

    await client.connect();
    const fieldset = client.fieldsets[1];

    console.log(`Controlling fieldset ${fieldset.name}`);
    for (const field of fieldset.fields) {
        console.log(`   Field ${field.id} is ${field.name}`);
    };

    fieldset.ws.on("message", data => console.log(JSON.parse(data.toString())));

})();
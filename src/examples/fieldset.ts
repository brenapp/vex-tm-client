import Client, { AuthenticatedRole } from "../main";

const client = new Client("http://127.0.0.1", AuthenticatedRole.ADMINISTRATOR, "hello");

(async function () {

    await client.connect();
    const fieldset = client.fieldsets[0];
    const fields = await fieldset.getFields();

    console.log(`Controlling fieldset ${fieldset.name}`);
    for (const [id, name] of Object.entries(fields)) {
        console.log(`   Field ${id} is ${name}`);
    };

    await fieldset.queueMatch("AUTON_SKILLS", 1);
})();
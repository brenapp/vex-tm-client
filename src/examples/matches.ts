import Client, { AuthenticatedRole } from "../main";

const client = new Client("http://127.0.0.1", AuthenticatedRole.ADMINISTRATOR, "hello");

(async function () {

    await client.connect();
    const division = client.divisions[0];

    console.log(`Controlling division ${division.name}`);

    for (const rankings of division.rankings) {
        console.log(rankings);
    };

})();
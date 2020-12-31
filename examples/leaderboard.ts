/**
 * Examples for a custom skills leaderboard system
 */

import Tournament, { AuthenticatedRole } from "../src/main"

(async function() {

    const client = new Tournament("http://localhost", AuthenticatedRole.ADMINISTRATOR, "hello");
    await client.connect();

    const skills = await client.getSkills();
    console.log(skills);
    
})();
# Tournament Manager API

This package is a client library for the [Tournament Manager
API](https://docs.google.com/document/d/1LYMOsPlYzZF3SYyTNPe2b3fvlbFc5XvA_Dmd-JH7ieU/edit#heading=h.84iql6kq0cm)

- Automatically manages authorization process, and ensures a valid bearer token is present for every
  request

- Supports the full API surface

- Strongly typed

- Does not throw exceptions, which is very useful for preventing crashes in applications.

- Easy to use

## Developing An Integration

Developers need to obtain credentials from DWAB to create integrations.

## Example Usage

See `examples/basic.ts` for an example of basic functionality.

```javascript
import { Client, FieldsetQueueSkillsType, MatchRound } from "vex-tm-client";
import authorization from "./credentials.json";

const client = new Client({
  address: "http://localhost",
  authorization: {
    client_id: authorization.client_id,
    client_secret: authorization.client_secret,
    grant_type: "client_credentials",
    expiration_date: authorization.expiration_date,
  },
});

const result = await client.connect();
if (!result.success) {
  console.error("Could not connect to TM instance", result);
  return;
}

const divisions = await client.getDivisions();
if (!divisions.success) {
  console.error("divisions", divisions);
  return;
}

console.log(divisions);

const division = divisions.data[0];

const teams = await division.getTeams();
if (!teams.success) {
  console.error("teams", teams);
  return;
}

console.log(teams);

const matches = await division.getMatches();
if (!matches.success) {
  console.error("matches", matches);
  return;
}

for (const match of matches.data) {
  console.log(match);
}

const rankings = await division.getRankings(MatchRound.Qualification);
if (!rankings.success) {
  console.error("rankings", rankings);
  return;
}

console.log(rankings);

const fieldsets = await client.getFieldsets();
if (!fieldsets.success) {
  console.error("fieldsets", fieldsets);
  return;
}

console.log(fieldsets);

const fieldset = fieldsets.data[0];
const fields = await fieldset.getFields();
if (!fields.success) {
  console.error("fields", fields);
  return;
}

console.log(fields.data);

const connection = await fieldset.connect();
if (!connection.success) {
  console.error("connection", connection);
  return;
}

fieldset.addEventListener("matchStarted", (event) => console.log(event.detail));
fieldset.addEventListener("matchStopped", (event) => console.log(event.detail));
fieldset.addEventListener("fieldActivated", (event) =>
  console.log(event.detail)
);
fieldset.addEventListener("fieldMatchAssigned", (event) =>
  console.log(event.detail)
);
fieldset.addEventListener("audienceDisplayChanged", (event) =>
  console.log(event.detail)
);

await fieldset.queueSkills(FieldsetQueueSkillsType.Driver);
await fieldset.startMatch(1);

fieldset.on("matchStopped", async (event) => {
  await fieldset.setAudienceDisplay(FieldsetAudienceDisplay.SkillsRankings);
});

process.on("exit", () => {
  fieldset.disconnect();
});
```

## Use In the Browser

This library is primarily designed for use in Node.js, however, it is possible to run in the browser
if you polyfill the following Node libraries using their bundler of choice:

```
events
crypto
```

Polyfill Tools:

- Vite: https://www.npmjs.com/package/vite-plugin-node-polyfills

## Disclaimer

This library is not developed or supported by DWAB, the REC Foundation, or VEX Robotics. Developers
are responsible for adhering to the Tournament Manager API Usage Agreement when developing integrations
using this library.

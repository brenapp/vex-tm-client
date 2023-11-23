

/**
 * Authorization Types
 **/

import { Division, DivisionData } from "./Division";
import { Fieldset, FieldsetData } from "./Fieldset";
import { Team } from "./Team";

export enum TMErrors {

    // DWAB Authorization Server
    CredentialsExpired = "Authorization Credentials have expired",
    CredentialsInvalid = "Authorization Credentials are invalid",
    CredentialsError = "Could not obtain bearer token from DWAB server",

    // TM Web Server
    WebServerError = "Tournament Manager Web Server returned non-200 status code",

    // Fieldset WebSocket
    WebSocketInvalidURL = "Fieldset WebSocket URL is invalid",
    WebSocketError = "Fieldset WebSocket could not be established",
    WebSocketClosed = "Fieldset WebSocket is closed",
};

export type RemoteAuthorizationArgs = {
    client_id: string;
    client_secret: string;
    grant_type: "client_credentials";
    expiration_date: number;
};

export type ClientArgs = {
    authorization: RemoteAuthorizationArgs;
    address: string;
};

export type BearerToken = {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export type BearerResult = {
    success: true;
    token: BearerToken;
} | {
    success: false;
    error: TMErrors.CredentialsError | TMErrors.CredentialsExpired | TMErrors.CredentialsInvalid;
    error_details?: unknown;
};

export type ConnectionResult = {
    success: true
} | {
    success: false;
    origin: "bearer" | "connection";
    error: TMErrors;
    error_details?: unknown;
}

export type APIResult<T> = {
    success: true;
    data: T;
} | {
    success: false;
    error: TMErrors;
    error_details?: unknown;
};

export type SkillsRanking = {
    rank: number;
    tie: boolean;
    number: string;
    totalScore: number;
    progHighScore: number;
    progAttempts: number;
    driverHighScore: number;
    driverAttempts: number;
};



/**
 * Client connection to Tournament Manager
 **/
export class Client {

    // Connection data
    public connectionArgs: ClientArgs;

    public bearerToken: BearerToken | null = null;
    public bearerExpiration: number | null = null;

    /**
     * Constructs a client connection to tournament manager
     * @param connectionArgs Connection Arguments
     */
    constructor(args: ClientArgs) {
        this.connectionArgs = args;
    }

    static CONNECTION_STRING = "https://auth.vextm.dwabtech.com/oauth2/token";

    /**
     * Obtains the bearer token from the DWAB authorization server. This bearer token is required to 
     * connect to the local Tournament Manager instance. 
     * 
     * @returns The bearer result, success is true if the token was obtained, false if there was an error
     **/
    async getBearer(): Promise<BearerResult> {

        if (this.connectionArgs.authorization.expiration_date < Date.now()) {
            return {
                success: false,
                error: TMErrors.CredentialsExpired
            };
        }

        const request = new Request(Client.CONNECTION_STRING, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            },
            body: new URLSearchParams({
                client_id: this.connectionArgs.authorization.client_id,
                client_secret: this.connectionArgs.authorization.client_secret,
                grant_type: this.connectionArgs.authorization.grant_type,
            }),
        });

        try {
            const response = await fetch(request);

            if (response.status !== 200) {
                const { error } = await response.json();

                switch (error) {
                    case "invalid_client":
                        return {
                            success: false,
                            error: TMErrors.CredentialsInvalid
                        };
                    default:
                        return {
                            success: false,
                            error: TMErrors.CredentialsError
                        };
                }
            }

            const token = await response.json() as BearerToken;

            this.bearerToken = token;
            this.bearerExpiration = Date.now() + token.expires_in * 1000;

            return {
                success: true,
                token
            };

        } catch (e) {
            return {
                success: false,
                error: TMErrors.CredentialsError,
                error_details: e
            };
        };

    };

    /**
     * Checks if the bearer token is valid
     * @returns true if the bearer token is valid, false otherwise
     */
    bearerValid(): boolean {
        return this.bearerExpiration !== null && this.bearerExpiration > Date.now();
    };

    /**
     * Ensures that the bearer token is valid, if it is not, it will obtain a new one
     * @returns The bearer result, success is true if the token was obtained, false if there was an error
     */
    async ensureBearer(): Promise<BearerResult> {
        if (this.bearerValid()) {
            return Promise.resolve({
                success: true,
                token: this.bearerToken!
            });
        } else {
            return this.getBearer();
        }
    };

    /**
     * Fetches the divisions from the local Tournament Manager instance
     * @returns The divisions, success is true if the divisions were obtained, false if there was an error
     */
    async getDivisions(): Promise<APIResult<Division[]>> {
        return this.get<{ divisions: DivisionData[] }>("/api/divisions").then(result => {
            if (!result.success) {
                return result;
            }

            const data = result.data.divisions.map(data => new Division(this, data));

            return {
                success: true,
                data
            };
        });
    }

    /**
     * Fetches the fieldsets from the local Tournament Manager instance
     * @returns The fieldsets, success is true if the fieldsets were obtained, false if there was an error
     */
    async getFieldsets(): Promise<APIResult<Fieldset[]>> {
        return this.get<{ fieldSets: FieldsetData[] }>("/api/fieldsets").then(result => {
            if (!result.success) {
                return result;
            }

            const data = result.data.fieldSets.map(data => new Fieldset(this, data));

            return {
                success: true,
                data
            };
        });
    };

    /**
     * Fetches teams in all divisions from the local Tournament Manager instance
     * @returns The teams, success is true if the teams were obtained, false if there was an error
     */
    async getTeams(): Promise<APIResult<Team[]>> {
        return this.get<Team[]>("/api/teams");
    }

    /**
     * Gets the skills rankings from the local Tournament Manager instance
     * @returns The skills rankings, success is true if the rankings were obtained, false if there was an error
     */
    async getSkills(): Promise<APIResult<SkillsRanking[]>> {
        return this.get<SkillsRanking[]>("/api/skills");
    }

    /**
     * Connects to the local Tournament Manager instance
     * @returns The connection result, success is true if the connection was established, false if there was an error
     */
    async connect(): Promise<ConnectionResult> {

        const result = await this.ensureBearer();
        if (!result.success) {
            return {
                success: false,
                origin: "bearer",
                error: result.error
            };
        }

        const divisionResult = await this.getDivisions();
        if (!divisionResult.success) {
            return {
                success: false,
                origin: "connection",
                error: divisionResult.error
            };
        }

        const fieldsetResult = await this.getFieldsets();
        if (!fieldsetResult.success) {
            return {
                success: false,
                origin: "connection",
                error: fieldsetResult.error
            };
        }

        return { success: true };
    };


    async get<T>(url: string): Promise<APIResult<T>> {
        const result = await this.ensureBearer();
        if (!result.success) {
            return {
                success: false,
                error: result.error
            };
        }

        const path = new URL(url, this.connectionArgs.address);

        const request = new Request(path, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${result.token.access_token}`,
                "Content-Type": "application/json"
            }
        });

        try {
            const response = await fetch(request);
            if (response.status !== 200) {
                return {
                    success: false,
                    error: TMErrors.WebServerError
                };
            }

            const data = await response.json() as T;

            return { success: true, data };
        } catch (e) {
            return {
                success: false,
                error: TMErrors.WebServerError,
                error_details: e
            };
        }
    };

}
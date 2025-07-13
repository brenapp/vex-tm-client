export enum TMErrors {
    // DWAB Authorization Server
    CredentialsExpired = "DWAB Third-Party Authorization Credentials have expired",
    CredentialsInvalid = "DWAB Third-Party Authorization Credentials are invalid",
    CredentialsError = "Could not obtain a bearer token from DWAB server",

    // TM Web Server
    WebServerError = "Tournament Manager Web Server returned non-200 status code",
    WebserverInvalidSignature = "Tournament Manager Client API Key is invalid",
    WebServerConnectionError = "Could not connect to Tournament Manager Web Server",
    WebServerNotEnabled = "The Tournament Manager API is not enabled",

    // Fieldset WebSocket
    WebSocketInvalidURL = "Fieldset WebSocket URL is invalid",
    WebSocketError = "Fieldset WebSocket could not be established",
    WebSocketClosed = "Fieldset WebSocket is closed",
}

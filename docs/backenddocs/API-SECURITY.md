# API Security

This backend is secured using an API Key mechanism to ensure that only authorized clients (like our trusted frontend application) can access its endpoints.

## How it works

1. **Global Protection:** Every incoming request to the API is intercepted by the `ApiKeyGuard` which is registered globally.
2. **Header Requirement:** For a request to be authorized, the client must include custom HTTP header in their request:
   - Header Name: `x-api-key`
   - Header Value: Must exactly match the configured API key on the backend.
3. **Configuration:** 
   - The backend reads the expected API key from the environment variable named `FRONTEND_API_KEY` located in the `.env` file.
   - **Important:** The actual API key is omitted from this documentation for security reasons. Please refer to your deployment's `.env` configuration file or request the current key from your administrator.
4. **Unauthorized Access:** If a request is received without the `x-api-key` header, or if the provided key is incorrect, the server will immediately reject the request with a `401 Unauthorized` response.
5. **Bypassing the Guard:** If there is a specific endpoint that needs to be publicly accessible without the API key (for example, receiving webhooks from external third-party services like payment gateways), developers can annotate the route or the controller with the `@SkipApiKey()` decorator.

## Frontend Implementation

When making HTTP requests from the frontend client (e.g. using `axios` or native `fetch`), ensure the API key is universally attached.

Example using `fetch`:

```javascript
fetch('http://localhost:3000/api/some-endpoint', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.REACT_APP_API_KEY // Load the actual key from frontend env variables
  }
})
```

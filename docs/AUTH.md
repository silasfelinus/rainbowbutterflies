# Rainbow Butterflies authentication

Rainbow Butterflies owns its login and signup experience. Kind Robots remains the canonical identity and API backend: there is one shared user record and one `userId`, not a separate Rainbow account database.

## Human-facing flow

Users stay on Rainbow for account UI:

- `/login` is the Rainbow sign-in and account-creation portal.
- Username/password sign-in is sent from the Rainbow server to the Kind Robots auth API; the browser does not receive a normal Kind Robots JWT.
- Account creation is sent from the Rainbow server to the canonical Kind Robots registration API, then Rainbow signs the new user into its own session.
- Google sign-in goes Rainbow -> Google -> Rainbow. The user is not shuttled through the Kind Robots login UI.
- Rainbow keeps its own signed, HttpOnly, SameSite=Lax session containing only the canonical user id and username.

The existing Kind Robots first-party authorization-code route remains available for compatibility and other first-party clients, but it is no longer the intended human-facing Rainbow login path.

## Google flow

1. `GET /api/auth/google/start` creates high-entropy `state` and PKCE S256 values in Rainbow and stores the pending flow in a short-lived signed HttpOnly cookie.
2. Rainbow asks Kind Robots for the public Google client ID while proving that the requested callback is registered for the `rainbow-butterflies` first-party client.
3. The browser is sent directly to Google with the exact Rainbow callback URI and PKCE challenge.
4. Google returns the browser to `GET /auth/google/callback` on Rainbow.
5. Rainbow validates its signed pending flow and state, then sends the Google authorization code and PKCE verifier server-to-server to Kind Robots.
6. Kind Robots, which retains `GOOGLE_SECRET`, exchanges the code with Google, requires a verified email, and finds or creates the canonical Kind Robots user.
7. Kind Robots returns only the canonical user id and username to Rainbow. Google access tokens are not persisted by Rainbow.
8. Rainbow creates its own session and returns the user to their original same-origin destination.

## Google Cloud Console

Use a **Web application** OAuth client. The existing Kind Robots Google client can be reused if desired; add Rainbow to it rather than creating a second identity silo.

Production authorized redirect URIs:

- `https://rainbowbutterflies.org/auth/google/callback`
- Keep `https://kindrobots.org/api/auth/google/callback` if direct Kind Robots Google sign-in should continue working.

Useful local-development redirect URI:

- `http://localhost:3000/auth/google/callback`

Authorized JavaScript origins are not required by this server-side redirect flow, but if Google Identity Services browser components are added later, use:

- `https://rainbowbutterflies.org`
- `http://localhost:3000` for local development

OAuth consent/branding values:

- App name: `Rainbow Butterflies`
- Home page: `https://rainbowbutterflies.org/`
- Privacy policy: `https://rainbowbutterflies.org/privacy`
- Authorized domain: `rainbowbutterflies.org`
- Keep `kindrobots.org` authorized if the same OAuth project/client continues serving Kind Robots.

The production callback is an exact URI. Do not add a trailing slash or substitute `www` unless the application is deliberately changed to use that exact address.

## Session signing

`RAINBOW_SESSION_SECRET` may be configured with a random value of at least 32 characters. That makes Rainbow sessions survive application restarts.

If it is absent, the server creates an in-memory random signing key at process startup. Authentication still works, but restarting the Rainbow container invalidates existing Rainbow sessions. A stable production secret should be installed through the deployment environment rather than source control.

The pending authorization cookie expires after five minutes. The Rainbow session expires after seven days.

## Routes

Rainbow-native routes:

- `GET /login` shows Rainbow sign-in/account creation.
- `POST /api/auth/login` performs server-side username/password authentication against Kind Robots and creates a Rainbow session.
- `POST /api/auth/register` creates the canonical Kind Robots user and then creates a Rainbow session.
- `GET /api/auth/google/start` starts direct Google OAuth.
- `GET /auth/google/callback` is the Google callback registered in Google Cloud Console.
- `GET /api/auth/me` returns either the minimum signed-in profile or an anonymous state.
- `POST /api/auth/logout` clears the Rainbow session and pending flow.

Legacy/compatibility routes:

- `GET /api/auth/start`
- `GET /auth/callback`

`returnTo` accepts only a same-origin application path. Protocol-relative, external, malformed, and backslash-containing destinations are rejected.

## Browser-storage boundary

No authentication secret, Google access token, Kind Robots password, normal Kind Robots JWT, API key, or agent credential is stored in Rainbow `localStorage` or `sessionStorage`. The public UI can see only the minimal `/api/auth/me` response (`id`, `username`, session expiry); the signed session cookie itself is HttpOnly.

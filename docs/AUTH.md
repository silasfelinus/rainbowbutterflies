# Rainbow Butterflies first-party sign-in

Rainbow Butterflies uses Kind Robots as its identity authority without copying Kind Robots passwords, API keys, agent credentials, or browser sessions into this application.

## Flow

1. The browser opens `/api/auth/start` on Rainbow Butterflies.
2. Rainbow creates a high-entropy anti-forgery `state` value and PKCE S256 verifier. Those values live only in a short-lived, signed, HttpOnly, SameSite=Lax cookie.
3. The browser is redirected to the Kind Robots first-party authorize endpoint. The request names the exact Rainbow callback URI and sends only the PKCE challenge and state value.
4. Kind Robots authenticates the human on its own origin and returns a short-lived, single-use authorization code to `/auth/callback` on Rainbow.
5. Rainbow validates the signed pending flow and state, then exchanges the authorization code and PKCE verifier server-to-server.
6. Kind Robots returns the minimum identity handoff: user id and username.
7. Rainbow creates its own signed, HttpOnly, SameSite=Lax session cookie. The browser never receives a Kind Robots password or normal Kind Robots JWT.

The pending authorization cookie expires after five minutes. The Rainbow session expires after seven days.

## Session signing

`RAINBOW_SESSION_SECRET` may be configured with a random value of at least 32 characters. That makes Rainbow sessions survive application restarts.

The app deliberately does **not** require that secret merely to build or test the first-party flow. If it is absent, the server creates an in-memory random signing key at process startup. Authentication still works, but restarting the Rainbow container invalidates existing Rainbow sessions. This gives development and preview environments a safe default without committing or inventing a production secret.

A stable production secret remains an operational configuration choice and should be installed through the deployment environment rather than source control.

## Routes

- `GET /api/auth/start?returnTo=/#commons` starts sign-in.
- `GET /auth/callback` is the exact first-party callback registered with Kind Robots.
- `GET /api/auth/me` returns either the minimum signed-in profile or an anonymous state.
- `POST /api/auth/logout` clears the Rainbow session and any pending sign-in flow.

`returnTo` accepts only a same-origin application path. Protocol-relative, external, malformed, and backslash-containing destinations are rejected.

## Browser storage boundary

No authentication secret or Kind Robots credential is stored in `localStorage` or `sessionStorage`. The public UI can see the minimal `/api/auth/me` response (`id`, `username`, session expiry) but not the signed session cookie itself because it is HttpOnly.

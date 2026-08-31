# relay

A lightweight TypeScript framework for building structured Express applications with decorator-based routing.

## Installation

```bash
npm install @sjoblomtobias/relay
```

## Usage

### 1. Create a route

Extend the `Route` class and decorate it with `@Public` or `@Private`. Override any of the built-in HTTP method handlers you need.

```ts
// src/routes/users.ts
import { Public, Route } from "@sjoblomtobias/relay";
import type { Request, Response, NextFunction } from "express";

@Public("/users")
export default class UsersRoute extends Route {
  protected get(req: Request, res: Response, next: NextFunction): void {
    res.json([{ id: 1, name: "Alice" }]);
  }

  protected getById(req: Request, res: Response, next: NextFunction): void {
    res.json({ id: req.params.id });
  }

  protected post(req: Request, res: Response, next: NextFunction): void {
    res.status(201).json(req.body);
  }

  protected patch(req: Request, res: Response, next: NextFunction): void {
    res.json({ id: req.params.id, ...req.body });
  }

  protected delete(req: Request, res: Response, next: NextFunction): void {
    res.status(204).send();
  }
}
```

### 2. Decorators

| Decorator | Description |
|-----------|-------------|
| `@Public(path)` | Registers the route at `path` without authentication |
| `@Private(path)` | Registers the route at `path`, applies `authMiddleware` if provided |
| `@Location(path, isPrivate?)` | Base decorator used by `@Public` and `@Private` |

### 3. Register routes and start the server

Import each route class explicitly and pass it to `registerRoutes`. Routes are never loaded implicitly from the filesystem, so the set of registered routes is always visible directly in your code.

```ts
// src/index.ts
import { Server } from "@sjoblomtobias/relay";
import UsersRoute from "./routes/users.js";

const server = new Server(3000);

server.registerRoutes(UsersRoute);

await server.start(undefined, () => {
  console.log("Ready!");
});
```

### 4. Authentication middleware

Pass an Express `RequestHandler` as the second argument to `Server`. It will be applied to all routes decorated with `@Private`. A route decorated with `@Private` throws when it's registered without an `authMiddleware` in place — set it before calling `registerRoutes`.

```ts
import { Server } from "@sjoblomtobias/relay";

const authMiddleware = (req, res, next) => {
  if (!req.headers.authorization) return res.status(401).send("Unauthorized");
  next();
};

const server = new Server(3000, authMiddleware);
```

You can also set it separately, as long as it happens before `registerRoutes`:

```ts
server.setAuthMiddleware(authMiddleware);
server.registerRoutes(UsersRoute);
```

## API

### `Server`

| Method | Description |
|--------|-------------|
| `new Server(port, authMiddleware?)` | Creates a new server instance |
| `registerRoutes(...routeClasses)` | Registers one or more route classes. Throws if a `@Private` route is registered before `authMiddleware` is set |
| `start(before?, after?)` | Starts the server. Awaits optional `before` callback, binds the port, then awaits optional `after` callback |
| `use(...handlers)` | Adds Express middleware |
| `getApp()` | Returns the underlying Express app |
| `setAuthMiddleware(middleware)` | Sets or replaces the authentication middleware. Must be called before `registerRoutes` for any `@Private` route |

### `Route`

Abstract base class. Override any of the following optional methods:

| Method | HTTP method | Path |
|--------|-------------|------|
| `get` | GET | `/location` |
| `getById` | GET | `/location/:id` |
| `post` | POST | `/location` |
| `patch` | PATCH | `/location/:id` |
| `delete` | DELETE | `/location/:id` |

Override `getEndpoints()` to fully customize the endpoint configuration.

## Security

`Server` ships with a couple of safe defaults: the `X-Powered-By` header is disabled, and unhandled route errors are caught and returned as a generic `500` (the error message and stack trace are only included in the response when `NODE_ENV=development`).

Beyond that, relay is intentionally minimal and does not add any hardening middleware for you. Depending on what your app is exposed to, consider adding:

- [`helmet`](https://www.npmjs.com/package/helmet) for standard security headers (CSP, HSTS, etc.)
- A rate limiter such as [`express-rate-limit`](https://www.npmjs.com/package/express-rate-limit) to slow down brute-force and abuse
- Body size limits on `express.json()` / `express.urlencoded()` to avoid oversized request payloads

These can be registered like any other Express middleware via `server.use(...)`:

```ts
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import express from "express";

server.use(helmet(), rateLimit({ windowMs: 60_000, limit: 100 }), express.json({ limit: "100kb" }));
```

Also keep in mind:

- `authMiddleware` must be set (via the `Server` constructor or `setAuthMiddleware`) **before** calling `registerRoutes` — registering a `@Private` route without it throws rather than silently serving the route unprotected.
- Route classes are only ever registered explicitly via `registerRoutes`; nothing is loaded implicitly from the filesystem, so the set of exposed routes is always visible in your own code.

## License

Pirate

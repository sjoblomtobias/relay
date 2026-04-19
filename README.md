# relay

A lightweight TypeScript framework for building structured Express applications with decorator-based routing and automatic route loading.

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
import type { Request, Response } from "express";

@Public("/users")
export default class UsersRoute extends Route {
  protected get(req: Request, res: Response): void {
    res.json([{ id: 1, name: "Alice" }]);
  }

  protected getById(req: Request, res: Response): void {
    res.json({ id: req.params.id });
  }

  protected post(req: Request, res: Response): void {
    res.status(201).json(req.body);
  }

  protected patch(req: Request, res: Response): void {
    res.json({ id: req.params.id, ...req.body });
  }

  protected delete(req: Request, res: Response): void {
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

### 3. Start the server

```ts
// src/index.ts
import { Server } from "@sjoblomtobias/relay";

const server = new Server(3000, "routes");

await server.start(
  async () => {
    // Runs before the server binds — load routes, connect to DB, etc.
    await server.loadRoutes(import.meta.dirname);
  },
  () => {
    console.log("Ready!");
  }
);
```

### 4. Authentication middleware

Pass an Express `RequestHandler` as the third argument to `Server`. It will be applied to all routes decorated with `@Private`.

```ts
import { Server } from "@sjoblomtobias/relay";

const authMiddleware = (req, res, next) => {
  if (!req.headers.authorization) return res.status(401).send("Unauthorized");
  next();
};

const server = new Server(3000, "routes", authMiddleware);
```

You can also set or update it later:

```ts
server.setAuthMiddleware(authMiddleware);
```

## API

### `Server`

| Method | Description |
|--------|-------------|
| `new Server(port, routesDir, authMiddleware?)` | Creates a new server instance |
| `loadRoutes(baseDir?)` | Dynamically imports all route files from `baseDir/routesDir`. Defaults `baseDir` to `process.cwd()` |
| `start(before?, after?)` | Starts the server. Awaits optional `before` callback, binds the port, then awaits optional `after` callback |
| `use(...handlers)` | Adds Express middleware |
| `getApp()` | Returns the underlying Express app |
| `setAuthMiddleware(middleware)` | Sets or replaces the authentication middleware |

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

## License

Pirate

import { STATUS_CODES } from "node:http";
import express from "express";
import type { Route } from "./route.js";
import type { ErrorRequestHandler, RequestHandler } from "express";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouteConstructor = new (...args: any[]) => Route;

export type ServerOptions = {
	/** Include error message and stack trace in 500 responses. Never enable in production. Defaults to false. */
	exposeErrors?: boolean;
	/** Maximum time in milliseconds a client has to send a complete request. Defaults to 30000. */
	requestTimeoutMs?: number;
};

const securityHeaders: RequestHandler = (req, res, next) => {
	res.set({
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options": "DENY",
		"Referrer-Policy": "no-referrer"
	});
	next();
};

/**
 * Returns the 4xx status carried by an error (e.g. from body parsing), or 500 for anything else.
 */
function errorStatus(err: unknown): number {
	const { status, statusCode } = (err ?? {}) as { status?: unknown; statusCode?: unknown };
	const candidate = status ?? statusCode;
	return typeof candidate === "number" && candidate >= 400 && candidate < 500 ? candidate : 500;
}

export class Server {
	private port: number;
	private app: express.Express;
	private stack: express.Router;
	private authMiddleware?: RequestHandler;
	private routesRegistered = false;
	private readonly options: Required<ServerOptions>;

	/**
	 * Creates an instance of the Server class.
	 * @param port The port number on which the server will listen.
	 * @param authMiddleware Optional authentication middleware to be used for private routes.
	 * @param options Optional server settings.
	 */
	constructor(port: number, authMiddleware?: RequestHandler, options: ServerOptions = {}) {
		this.port = port;
		this.options = { exposeErrors: false, requestTimeoutMs: 30_000, ...options };
		this.app = express();
		this.app.disable("x-powered-by");
		this.app.use(securityHeaders);
		// Routes and middleware live in an inner router so the error handler, mounted
		// after it, always runs last and catches errors from everything registered via this class.
		this.stack = express.Router();
		this.app.use(this.stack);
		this.app.use(this.errorHandler);
		this.authMiddleware = authMiddleware;
	}

	/**
	 * Default error handler. Client errors (4xx) keep their status; everything else is a
	 * generic 500 and is logged. Error details are only sent when `exposeErrors` is enabled.
	 */
	private readonly errorHandler: ErrorRequestHandler = (err, req, res, next) => {
		if (res.headersSent) {
			next(err);
			return;
		}
		const status = errorStatus(err);
		if (status === 500) {
			console.error(err);
		}
		res.status(status).json({
			error: STATUS_CODES[status],
			...(status === 500 && this.options.exposeErrors && { message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined })
		});
	};

	/**
	 * Registers one or more route classes with the server.
	 * @param routeClasses - Route classes decorated with @Public or @Private.
	 */
	public registerRoutes(...routeClasses: Array<RouteConstructor>): void {
		this.routesRegistered = true;
		routeClasses.forEach((RouteClass) => {
			const routeInstance = new RouteClass(this.authMiddleware);
			this.stack.use(routeInstance.router);
		});
	}

	/**
	 * Adds middleware functions to the Express application. Use this instead of
	 * `getApp().use()` so errors from the middleware reach the error handler.
	 * @param handlers - Array of Express request handlers (middleware functions).
	 */
	public async use(...handlers: Array<express.RequestHandler>): Promise<void> {
		this.stack.use(handlers);
	}

	/**
	 * Gets the Express application instance.
	 * @returns The Express application instance.
	 */
	public getApp(): express.Express {
		return this.app;
	}

	/**
	 * Starts the Express server.
	 * @param before Optional callback invoked before the server starts.
	 * @param after Optional callback invoked after the server has started.
	 * @throws If the server cannot listen, e.g. the port is already in use.
	 */
	public async start(before?: () => void | Promise<void>, after?: () => void | Promise<void>): Promise<void> {
		if (before) {
			await before();
		}
		await new Promise<void>((resolve, reject) => {
			// Express 5 passes listen errors (e.g. EADDRINUSE) to the callback.
			const httpServer = this.app.listen(this.port, (err?: Error) => (err ? reject(err) : resolve()));
			httpServer.requestTimeout = this.options.requestTimeoutMs;
		});
		if (after) {
			await after();
		}
	}

	/**
	 * Sets the authentication middleware for private routes. Must be called before
	 * registerRoutes(), since routes capture the middleware when they are registered.
	 */
	public setAuthMiddleware(middleware: RequestHandler) {
		if (this.routesRegistered) {
			throw new Error("setAuthMiddleware() must be called before registerRoutes(); already registered routes would not use it.");
		}
		this.authMiddleware = middleware;
	}
}

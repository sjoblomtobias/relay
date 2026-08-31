import express from "express";
import type { Route } from "./route.js";
import type { ErrorRequestHandler, RequestHandler } from "express";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouteConstructor = new (...args: any[]) => Route;

export class Server {
	private port: number;
	private app: express.Express;
	private authMiddleware?: RequestHandler;

	/**
	 * Creates an instance of the Server class.
	 * @param port The port number on which the server will listen.
	 * @param authMiddleware Optional authentication middleware to be used for private routes.
	 */
	constructor(port: number, authMiddleware?: RequestHandler) {
		this.port = port;
		this.app = express();
		this.app.disable("x-powered-by");
		this.authMiddleware = authMiddleware;
	}

	/**
	 * Default error handler. Returns a generic 500 response, only including
	 * the error message and stack trace when NODE_ENV is "development".
	 */
	private readonly errorHandler: ErrorRequestHandler = (err, req, res, next) => {
		if (res.headersSent) {
			next(err);
			return;
		}
		const isDevelopment = process.env.NODE_ENV === "development";
		res.status(500).json({
			error: "Internal Server Error",
			...(isDevelopment && { message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined })
		});
	};

	/**
	 * Registers one or more route classes with the server.
	 * @param routeClasses - Route classes decorated with @Public or @Private.
	 */
	public registerRoutes(...routeClasses: Array<RouteConstructor>): void {
		routeClasses.forEach((RouteClass) => {
			const routeInstance = new RouteClass(this.authMiddleware);
			this.app.use(routeInstance.router);
		});
	}

	/**
	 * Adds middleware functions to the Express application.
	 * @param handlers - Array of Express request handlers (middleware functions).
	 */
	public async use(...handlers: Array<express.RequestHandler>): Promise<void> {
		this.app.use(handlers);
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
	 */
	public async start(before?: () => void | Promise<void>, after?: () => void | Promise<void>): Promise<void> {
		if (before) {
			await before();
		}
		this.app.use(this.errorHandler);
		await new Promise<void>((resolve) => {
			this.app.listen(this.port, () => {
				resolve();
			});
		});
		if (after) {
			await after();
		}
	}

	public setAuthMiddleware(middleware: RequestHandler) {
		this.authMiddleware = middleware;
	}
}

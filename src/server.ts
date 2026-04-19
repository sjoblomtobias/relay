import fs from "fs";
import path from "path";
import express from "express";
import type { RequestHandler } from "express";

export class Server {
	private port: number;
	private routesDirectory: string;
	private app: express.Express;
	private authMiddleware?: RequestHandler;

	/**
	 * Creates an instance of the Server class.
	 * @param port The port number on which the server will listen.
	 * @param routesDirectory The directory where route files are located.
	 * @param authMiddleware Optional authentication middleware to be used for private routes.
	 */
	constructor(port: number, routesDirectory: string, authMiddleware?: RequestHandler) {
		this.port = port;
		this.routesDirectory = routesDirectory;
		this.app = express();
		this.authMiddleware = authMiddleware;
	}

	/**
	 * Loads all routes from the specified directory.
	 * @param baseDir The base directory to resolve the routes directory from. Defaults to process.cwd().
	 * @returns Promise that resolves when all routes are loaded.
	 */
	public async loadRoutes(baseDir: string = process.cwd()): Promise<void> {
		const routes = path.join(baseDir, this.routesDirectory);
		if (!fs.existsSync(routes)) {
			throw new Error(`Routes directory "${routes}" does not exist.`);
		}
		const files = fs.readdirSync(routes);
		await Promise.all(
			files.map(async (file) => {
				const modulePath = path.join(routes, file);
				const module = await import(modulePath);
				const RouteClass = module.default;

				// Pass authMiddleware to Route constructor
				const routeInstance = new RouteClass(this.authMiddleware);
				this.app.use(routeInstance.router);
			})
		);
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

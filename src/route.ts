import { Router } from "express";
import type { Request, Response, NextFunction } from "express";

/**
 * Decorator to set the base path and authentication requirement for a route class.
 * @param location - The base path for the route.
 * @param isPrivate - Whether to use authentication middleware.
 * @returns A decorator function.
 */
export function Location(location: string, isPrivate: boolean = false) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return function <T extends { new (...args: any[]): object }>(constructor: T) {
		return class extends constructor {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			constructor(...args: any[]) {
				super(location, isPrivate, ...args);
			}
		};
	};
}

/**
 * Decorator to mark a route class as private.
 * @param location - The base path for the route.
 * @returns A decorator function.
 */
export function Private(location: string) {
	return Location(location, true);
}

/**
 * Decorator to mark a route class as public.
 * @param location - The base path for the route.
 * @returns A decorator function.
 */
export function Public(location: string) {
	return Location(location, false);
}

export type Endpoint = {
	path?: string;
	handler: ((req: Request, res: Response, next: NextFunction) => void) | undefined;
	routerMethod: (path: string, ...handlers: Array<(req: Request, res: Response, next: NextFunction) => void>) => void;
};

export abstract class Route {
	public router: Router;
	public location: string;
	public isPrivate: boolean;
	public authMiddleware?: (req: Request, res: Response, next: NextFunction) => void;

	constructor(location: string, isPrivate: boolean = false, authMiddleware?: (req: Request, res: Response, next: NextFunction) => void) {
		this.router = Router();
		this.location = location;
		this.isPrivate = isPrivate;
		this.authMiddleware = authMiddleware;
		this.initializeRoutes();
	}

	/**
	 * Initializes the routes based on the implemented methods in the subclass.
	 */
	protected initializeRoutes() {
		if (this.isPrivate && !this.authMiddleware) {
			throw new Error(`Route "${this.location}" is marked private but no authMiddleware was provided. Refusing to register it unprotected.`);
		}
		this.getEndpoints().forEach(({ path, handler, routerMethod }) => {
			if (typeof handler === "function") {
				const handlers = this.isPrivate && this.authMiddleware ? [this.authMiddleware, handler.bind(this)] : [handler.bind(this)];
				const fullPath = path ? `${this.location}${path}` : `${this.location}`;
				routerMethod(fullPath, ...handlers);
			}
		});
	}

	/**
	 * Returns an array of endpoint configurations.
	 * @returns Array of endpoint configurations. Override in subclass to customize endpoint paths.
	 */
	protected getEndpoints(): Array<Endpoint> {
		return [
			{ path: "/:id", handler: this.getById, routerMethod: this.router.get.bind(this.router) },
			{ handler: this.get, routerMethod: this.router.get.bind(this.router) },
			{ handler: this.post, routerMethod: this.router.post.bind(this.router) },
			{ path: "/:id", handler: this.patch, routerMethod: this.router.patch.bind(this.router) },
			{ path: "/:id", handler: this.delete, routerMethod: this.router.delete.bind(this.router) }
		];
	}

	/**
	 * Handles GET requests to retrieve a resource by ID.
	 * @param req - The Express request object.
	 * @param res - The Express response object.
	 * @param next - The next middleware function.
	 */
	protected getById?(req: Request, res: Response, next: NextFunction): void;

	/**
	 * Handles GET requests to retrieve a resource.
	 * @param req - The Express request object.
	 * @param res - The Express response object.
	 * @param next - The next middleware function.
	 */
	protected get?(req: Request, res: Response, next: NextFunction): void;

	/**
	 * Handles POST requests to create a new resource.
	 * @param req - The Express request object.
	 * @param res - The Express response object.
	 * @param next - The next middleware function.
	 */
	protected post?(req: Request, res: Response, next: NextFunction): void;

	/**
	 * Handles PATCH requests to update an existing resource.
	 * @param req - The Express request object.
	 * @param res - The Express response object.
	 * @param next - The next middleware function.
	 */
	protected patch?(req: Request, res: Response, next: NextFunction): void;

	/**
	 * Handles DELETE requests to remove a resource.
	 * @param req - The Express request object.
	 * @param res - The Express response object.
	 * @param next - The next middleware function.
	 */
	protected delete?(req: Request, res: Response, next: NextFunction): void;
}

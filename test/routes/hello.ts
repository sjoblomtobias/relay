import { Public, Route } from "../../src/route.js";
import type { Request, Response } from "express";

@Public("/hello")
export default class HelloRoute extends Route {
	protected get(req: Request, res: Response): void {
		res.json({ message: "Hello from relay!" });
	}
}

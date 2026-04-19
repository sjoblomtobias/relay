import { Server } from "../src/server.js";

const server = new Server(3000, "routes");

server.start(
	() => {
		console.log("Before start: loading routes...");
		return server.loadRoutes(import.meta.dirname);
	},
	() => {
		console.log(`⚡ Server running on port: ${server['port']}`);
	}
);

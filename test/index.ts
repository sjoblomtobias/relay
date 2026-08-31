import { Server } from "../src/server.js";
import HelloRoute from "./routes/hello.js";

const server = new Server(3000);

server.registerRoutes(HelloRoute);

server.start(
	() => {
		console.log("Before start: registering routes...");
	},
	() => {
		console.log(`⚡ Server running on port: ${server["port"]}`);
	}
);

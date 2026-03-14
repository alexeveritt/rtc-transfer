import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("join", "routes/join.tsx"),
	route("transfer/:code", "routes/transfer.tsx"),
	route("support", "routes/support.tsx"),
	route("privacy", "routes/privacy.tsx"),
	route("how-it-works", "routes/how-it-works.tsx"),
] satisfies RouteConfig;

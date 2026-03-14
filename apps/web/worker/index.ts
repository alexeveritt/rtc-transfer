import { SessionDurableObject } from "@rtc-transfer/cloudflare";
import { generateShortCode, rawCode } from "@rtc-transfer/lib";
import { createRequestHandler } from "react-router";

export { SessionDurableObject };

interface Env {
	SESSION_DO: DurableObjectNamespace;
}

const requestHandler = createRequestHandler(
	// @ts-expect-error virtual module from @react-router/dev
	() => import("virtual:react-router/server-build"),
	import.meta.env.MODE,
);

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Handle WebSocket upgrade before React Router (it can't handle 101 responses)
		const wsMatch = url.pathname.match(/^\/api\/session\/([^/]+)\/ws$/);
		if (wsMatch) {
			const code = wsMatch[1];
			const raw = rawCode(code);
			const id = env.SESSION_DO.idFromName(raw);
			const stub = env.SESSION_DO.get(id);

			return stub.fetch(
				new Request("https://do/ws", {
					headers: request.headers,
				}),
			);
		}

		// Handle session creation API (POST only, before React Router)
		if (url.pathname === "/api/session" && request.method === "POST") {
			const code = generateShortCode();
			const raw = rawCode(code);
			const id = env.SESSION_DO.idFromName(raw);
			const stub = env.SESSION_DO.get(id);

			const response = await stub.fetch(
				new Request(`https://do/init?code=${encodeURIComponent(code)}`),
			);
			const sessionState = (await response.json()) as {
				id: string;
				code: string;
				expiresAt: string;
			};

			return Response.json({
				sessionId: sessionState.id,
				code: sessionState.code,
				transferUrl: `/transfer/${sessionState.code}`,
				expiresAt: sessionState.expiresAt,
			});
		}

		// Handle session state lookup
		const stateMatch = url.pathname.match(/^\/api\/session\/([^/]+)$/);
		if (stateMatch && request.method === "GET") {
			const code = stateMatch[1];
			const raw = rawCode(code);
			const id = env.SESSION_DO.idFromName(raw);
			const stub = env.SESSION_DO.get(id);

			return stub.fetch(new Request("https://do/state"));
		}

		// Delegate everything else to React Router
		return requestHandler(request, { cloudflare: { env, ctx } });
	},
} satisfies ExportedHandler<Env>;

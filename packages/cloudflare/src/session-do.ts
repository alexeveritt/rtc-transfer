import type {
	Participant,
	ParticipantInfo,
	ServerMessage,
	SessionPublicState,
	SessionState,
	SessionStatus,
} from "@rtc-transfer/protocol";
import { ClientMessageSchema } from "@rtc-transfer/protocol";
import * as v from "valibot";

interface ParticipantAttachment {
	participantId: string;
}

export class SessionDurableObject implements DurableObject {
	private session: SessionState | null = null;
	private participants = new Map<string, Participant>();

	constructor(
		private readonly state: DurableObjectState,
		private readonly env: Record<string, unknown>,
	) {}

	async initialize(code: string): Promise<SessionState> {
		let session = await this.state.storage.get<SessionState>("session");
		if (session) return session;

		session = {
			id: this.state.id.toString(),
			code,
			status: "created",
			createdAt: new Date().toISOString(),
			expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
		};

		await this.state.storage.put("session", session);
		this.session = session;

		await this.state.storage.setAlarm(new Date(session.expiresAt));

		return session;
	}

	async getPublicState(): Promise<SessionPublicState | null> {
		await this.loadState();
		if (!this.session) return null;

		return {
			code: this.session.code,
			status: this.session.status,
			participants: this.getParticipantInfos(),
		};
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/init") {
			const code = url.searchParams.get("code");
			if (!code) return new Response("Missing code", { status: 400 });
			const session = await this.initialize(code);
			return Response.json(session);
		}

		if (url.pathname === "/ws") {
			return this.handleWebSocket(request);
		}

		if (url.pathname === "/state") {
			const state = await this.getPublicState();
			if (!state) {
				return new Response(JSON.stringify({ error: "Session not found" }), { status: 404 });
			}
			return new Response(JSON.stringify(state), {
				headers: { "Content-Type": "application/json" },
			});
		}

		return new Response("Not found", { status: 404 });
	}

	private async handleWebSocket(_request: Request): Promise<Response> {
		await this.loadState();

		if (!this.session) {
			return new Response("Session not found", { status: 404 });
		}

		if (this.participants.size >= 2) {
			return new Response("Session full", { status: 409 });
		}

		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);

		const participantId = crypto.randomUUID();
		const participant: Participant = {
			id: participantId,
			status: "connected",
			name: null,
			joinedAt: new Date().toISOString(),
		};

		this.participants.set(participantId, participant);
		await this.state.storage.put(`participant:${participantId}`, participant);

		await this.updateSessionStatus();

		this.state.acceptWebSocket(server, [participantId]);

		(
			server as unknown as { serializeAttachment: (a: ParticipantAttachment) => void }
		).serializeAttachment({
			participantId,
		});

		const stateMsg: ServerMessage = {
			type: "session_state",
			session: {
				code: this.session.code,
				status: this.session.status,
				participants: this.getParticipantInfos(),
			},
			yourId: participantId,
		};
		server.send(JSON.stringify(stateMsg));

		this.broadcast(
			{
				type: "participant_joined",
				participant: this.toInfo(participant),
			},
			participantId,
		);

		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
		if (typeof message !== "string") return;
		await this.loadState();

		const attachment = (
			ws as unknown as { deserializeAttachment: () => ParticipantAttachment }
		).deserializeAttachment();
		const participantId = attachment.participantId;

		let parsed: unknown;
		try {
			parsed = JSON.parse(message);
		} catch {
			this.sendTo(ws, { type: "error", code: "INVALID_JSON", message: "Invalid JSON" });
			return;
		}

		const result = v.safeParse(ClientMessageSchema, parsed);
		if (!result.success) {
			this.sendTo(ws, {
				type: "error",
				code: "INVALID_MESSAGE",
				message: "Invalid message format",
			});
			return;
		}

		const msg = result.output;

		switch (msg.type) {
			case "set_name": {
				const participant = this.participants.get(participantId);
				if (!participant) return;

				participant.name = msg.name;
				participant.status = "named";
				await this.state.storage.put(`participant:${participantId}`, participant);

				this.broadcastAll({
					type: "participant_updated",
					participant: this.toInfo(participant),
				});
				break;
			}
			case "ping": {
				this.sendTo(ws, { type: "pong" });
				break;
			}
			case "signal": {
				this.broadcast({ type: "signal", from: participantId, data: msg.data }, participantId);
				break;
			}
			case "file_offer": {
				this.broadcast(
					{
						type: "file_offer",
						from: participantId,
						fileId: msg.fileId,
						fileName: msg.fileName,
						fileSize: msg.fileSize,
						fileType: msg.fileType,
					},
					participantId,
				);
				break;
			}
			case "file_accept": {
				this.broadcast(
					{ type: "file_accept", from: participantId, fileId: msg.fileId },
					participantId,
				);
				break;
			}
			case "file_reject": {
				this.broadcast(
					{ type: "file_reject", from: participantId, fileId: msg.fileId },
					participantId,
				);
				break;
			}
			case "transfer_pause": {
				this.broadcast(
					{ type: "transfer_pause", from: participantId, fileId: msg.fileId },
					participantId,
				);
				break;
			}
			case "transfer_resume": {
				this.broadcast(
					{ type: "transfer_resume", from: participantId, fileId: msg.fileId },
					participantId,
				);
				break;
			}
			case "transfer_cancel": {
				this.broadcast(
					{ type: "transfer_cancel", from: participantId, fileId: msg.fileId },
					participantId,
				);
				break;
			}
		}
	}

	async webSocketClose(
		ws: WebSocket,
		_code: number,
		_reason: string,
		_wasClean: boolean,
	): Promise<void> {
		await this.loadState();
		await this.handleDisconnect(ws);
	}

	async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
		await this.loadState();
		await this.handleDisconnect(ws);
	}

	async alarm(): Promise<void> {
		const sockets = this.state.getWebSockets();
		for (const ws of sockets) {
			ws.close(1000, "Session expired");
		}
		await this.state.storage.deleteAll();
	}

	private async handleDisconnect(ws: WebSocket): Promise<void> {
		const attachment = (
			ws as unknown as { deserializeAttachment: () => ParticipantAttachment }
		).deserializeAttachment();
		const participantId = attachment.participantId;

		this.participants.delete(participantId);
		await this.state.storage.delete(`participant:${participantId}`);

		await this.updateSessionStatus();

		this.broadcastAll({
			type: "participant_left",
			participantId,
		});

		try {
			ws.close(1000, "Disconnected");
		} catch {
			// Already closed
		}
	}

	private async loadState(): Promise<void> {
		if (!this.session) {
			this.session = (await this.state.storage.get<SessionState>("session")) ?? null;
		}

		if (this.participants.size === 0) {
			const entries = await this.state.storage.list<Participant>({ prefix: "participant:" });
			for (const [, value] of entries) {
				this.participants.set(value.id, value);
			}
		}
	}

	private async updateSessionStatus(): Promise<void> {
		if (!this.session) return;

		let newStatus: SessionStatus;
		if (this.participants.size === 0) {
			newStatus = "created";
		} else if (this.participants.size === 1) {
			newStatus = "waiting_for_peer";
		} else {
			newStatus = "peer_joined";
		}

		if (this.session.status !== newStatus) {
			this.session.status = newStatus;
			await this.state.storage.put("session", this.session);
		}
	}

	private getParticipantInfos(): ParticipantInfo[] {
		return Array.from(this.participants.values()).map(this.toInfo);
	}

	private toInfo(p: Participant): ParticipantInfo {
		return { id: p.id, name: p.name, status: p.status };
	}

	private broadcast(msg: ServerMessage, excludeId?: string): void {
		const data = JSON.stringify(msg);
		for (const ws of this.state.getWebSockets()) {
			const attachment = (
				ws as unknown as { deserializeAttachment: () => ParticipantAttachment }
			).deserializeAttachment();
			if (attachment.participantId !== excludeId) {
				ws.send(data);
			}
		}
	}

	private broadcastAll(msg: ServerMessage): void {
		this.broadcast(msg);
	}

	private sendTo(ws: WebSocket, msg: ServerMessage): void {
		ws.send(JSON.stringify(msg));
	}
}

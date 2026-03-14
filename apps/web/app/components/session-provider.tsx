import type { ParticipantInfo, ServerMessage, SessionPublicState } from "@rtc-transfer/protocol";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface SessionContextValue {
	session: SessionPublicState | null;
	yourId: string | null;
	connected: boolean;
	error: string | null;
	sendName: (name: string) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
	const ctx = useContext(SessionContext);
	if (!ctx) throw new Error("useSession must be used within SessionProvider");
	return ctx;
}

interface SessionProviderProps {
	code: string;
	children: ReactNode;
}

export function SessionProvider({ code, children }: SessionProviderProps) {
	const [session, setSession] = useState<SessionPublicState | null>(null);
	const [yourId, setYourId] = useState<string | null>(null);
	const [connected, setConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const wsRef = useRef<WebSocket | null>(null);
	const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const wsUrl = `${protocol}//${window.location.host}/api/session/${code}/ws`;
		const ws = new WebSocket(wsUrl);
		wsRef.current = ws;

		ws.addEventListener("open", () => {
			setConnected(true);
			setError(null);
			// Ping every 30 seconds to keep connection alive
			pingIntervalRef.current = setInterval(() => {
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(JSON.stringify({ type: "ping" }));
				}
			}, 30000);
		});

		ws.addEventListener("message", (event) => {
			const msg = JSON.parse(event.data) as ServerMessage;

			switch (msg.type) {
				case "session_state":
					setSession(msg.session as SessionPublicState);
					setYourId(msg.yourId);
					break;
				case "participant_joined":
					setSession((prev) => {
						if (!prev) return prev;
						return {
							...prev,
							participants: [...prev.participants, msg.participant as ParticipantInfo],
							status: prev.participants.length + 1 >= 2 ? "peer_joined" : prev.status,
						};
					});
					break;
				case "participant_updated":
					setSession((prev) => {
						if (!prev) return prev;
						return {
							...prev,
							participants: prev.participants.map((p) =>
								p.id === msg.participant.id ? (msg.participant as ParticipantInfo) : p,
							),
						};
					});
					break;
				case "participant_left":
					setSession((prev) => {
						if (!prev) return prev;
						const filtered = prev.participants.filter((p) => p.id !== msg.participantId);
						return {
							...prev,
							participants: filtered,
							status: filtered.length <= 1 ? "waiting_for_peer" : prev.status,
						};
					});
					break;
				case "error":
					setError(msg.message);
					break;
				case "pong":
					break;
			}
		});

		ws.addEventListener("close", () => {
			setConnected(false);
			if (pingIntervalRef.current) {
				clearInterval(pingIntervalRef.current);
			}
		});

		ws.addEventListener("error", () => {
			setError("Connection error");
			setConnected(false);
		});

		return () => {
			if (pingIntervalRef.current) {
				clearInterval(pingIntervalRef.current);
			}
			ws.close();
		};
	}, [code]);

	const sendName = useCallback((name: string) => {
		const ws = wsRef.current;
		if (ws?.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify({ type: "set_name", name }));
		}
	}, []);

	return (
		<SessionContext value={{ session, yourId, connected, error, sendName }}>
			{children}
		</SessionContext>
	);
}

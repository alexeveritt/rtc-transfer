import type { ParticipantInfo, ServerMessage, SessionPublicState } from "@rtc-transfer/protocol";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { IncomingFileOffer } from "../lib/webrtc";

type SignalHandler = (from: string, data: { type: string; payload: unknown }) => void;
type FileOfferHandler = (offer: IncomingFileOffer) => void;
type FileAcceptHandler = (from: string, fileId: string) => void;
type FileRejectHandler = (from: string, fileId: string) => void;
type TransferControlHandler = (from: string, fileId: string) => void;

interface SessionContextValue {
	session: SessionPublicState | null;
	yourId: string | null;
	connected: boolean;
	error: string | null;
	sendName: (name: string) => void;
	sendSignal: (data: { type: string; payload: unknown }) => void;
	sendFileOffer: (fileId: string, fileName: string, fileSize: number, fileType: string) => void;
	sendFileAccept: (fileId: string) => void;
	sendFileReject: (fileId: string) => void;
	sendTransferPause: (fileId: string) => void;
	sendTransferResume: (fileId: string) => void;
	sendTransferCancel: (fileId: string) => void;
	onSignal: (handler: SignalHandler) => void;
	onFileOffer: (handler: FileOfferHandler) => void;
	onFileAccept: (handler: FileAcceptHandler) => void;
	onFileReject: (handler: FileRejectHandler) => void;
	onTransferPause: (handler: TransferControlHandler) => void;
	onTransferResume: (handler: TransferControlHandler) => void;
	onTransferCancel: (handler: TransferControlHandler) => void;
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

	const signalHandlerRef = useRef<SignalHandler | null>(null);
	const fileOfferHandlerRef = useRef<FileOfferHandler | null>(null);
	const fileAcceptHandlerRef = useRef<FileAcceptHandler | null>(null);
	const fileRejectHandlerRef = useRef<FileRejectHandler | null>(null);
	const transferPauseHandlerRef = useRef<TransferControlHandler | null>(null);
	const transferResumeHandlerRef = useRef<TransferControlHandler | null>(null);
	const transferCancelHandlerRef = useRef<TransferControlHandler | null>(null);

	useEffect(() => {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const wsUrl = `${protocol}//${window.location.host}/api/session/${code}/ws`;
		const ws = new WebSocket(wsUrl);
		wsRef.current = ws;

		ws.addEventListener("open", () => {
			setConnected(true);
			setError(null);
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
				case "signal":
					signalHandlerRef.current?.(msg.from, msg.data);
					break;
				case "file_offer":
					fileOfferHandlerRef.current?.({
						fileId: msg.fileId,
						fileName: msg.fileName,
						fileSize: msg.fileSize,
						fileType: msg.fileType,
						from: msg.from,
					});
					break;
				case "file_accept":
					fileAcceptHandlerRef.current?.(msg.from, msg.fileId);
					break;
				case "file_reject":
					fileRejectHandlerRef.current?.(msg.from, msg.fileId);
					break;
				case "transfer_pause":
					transferPauseHandlerRef.current?.(msg.from, msg.fileId);
					break;
				case "transfer_resume":
					transferResumeHandlerRef.current?.(msg.from, msg.fileId);
					break;
				case "transfer_cancel":
					transferCancelHandlerRef.current?.(msg.from, msg.fileId);
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

	const send = useCallback((msg: unknown) => {
		const ws = wsRef.current;
		if (ws?.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(msg));
		}
	}, []);

	const sendName = useCallback((name: string) => send({ type: "set_name", name }), [send]);

	const sendSignal = useCallback(
		(data: { type: string; payload: unknown }) => send({ type: "signal", data }),
		[send],
	);

	const sendFileOffer = useCallback(
		(fileId: string, fileName: string, fileSize: number, fileType: string) =>
			send({ type: "file_offer", fileId, fileName, fileSize, fileType }),
		[send],
	);

	const sendFileAccept = useCallback(
		(fileId: string) => send({ type: "file_accept", fileId }),
		[send],
	);

	const sendFileReject = useCallback(
		(fileId: string) => send({ type: "file_reject", fileId }),
		[send],
	);

	const sendTransferPause = useCallback(
		(fileId: string) => send({ type: "transfer_pause", fileId }),
		[send],
	);

	const sendTransferResume = useCallback(
		(fileId: string) => send({ type: "transfer_resume", fileId }),
		[send],
	);

	const sendTransferCancel = useCallback(
		(fileId: string) => send({ type: "transfer_cancel", fileId }),
		[send],
	);

	const onSignal = useCallback((handler: SignalHandler) => {
		signalHandlerRef.current = handler;
	}, []);

	const onFileOffer = useCallback((handler: FileOfferHandler) => {
		fileOfferHandlerRef.current = handler;
	}, []);

	const onFileAccept = useCallback((handler: FileAcceptHandler) => {
		fileAcceptHandlerRef.current = handler;
	}, []);

	const onFileReject = useCallback((handler: FileRejectHandler) => {
		fileRejectHandlerRef.current = handler;
	}, []);

	const onTransferPause = useCallback((handler: TransferControlHandler) => {
		transferPauseHandlerRef.current = handler;
	}, []);

	const onTransferResume = useCallback((handler: TransferControlHandler) => {
		transferResumeHandlerRef.current = handler;
	}, []);

	const onTransferCancel = useCallback((handler: TransferControlHandler) => {
		transferCancelHandlerRef.current = handler;
	}, []);

	return (
		<SessionContext
			value={{
				session,
				yourId,
				connected,
				error,
				sendName,
				sendSignal,
				sendFileOffer,
				sendFileAccept,
				sendFileReject,
				sendTransferPause,
				sendTransferResume,
				sendTransferCancel,
				onSignal,
				onFileOffer,
				onFileAccept,
				onFileReject,
				onTransferPause,
				onTransferResume,
				onTransferCancel,
			}}
		>
			{children}
		</SessionContext>
	);
}

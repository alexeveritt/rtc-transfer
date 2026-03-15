import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { FileTransferProgress, IncomingFileOffer } from "../lib/webrtc";
import { PeerConnection } from "../lib/webrtc";
import type { CompletedTransfer } from "./completed-transfers";
import { CompletedTransfers } from "./completed-transfers";
import { FilePicker } from "./file-picker";
import { IncomingOffer } from "./incoming-offer";
import { NameEntry } from "./name-entry";
import { PresenceDisplay } from "./presence-display";
import type { ReceivedFile } from "./received-files";
import { ReceivedFiles } from "./received-files";
import { useSession } from "./session-provider";
import { TransferProgress } from "./transfer-progress";

export function TransferView() {
	const {
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
	} = useSession();

	const navigate = useNavigate();
	const pcRef = useRef<PeerConnection | null>(null);
	const pendingSendRef = useRef<Map<string, File>>(new Map());

	const [channelOpen, setChannelOpen] = useState(false);
	const [transfers, setTransfers] = useState<Map<string, FileTransferProgress>>(new Map());
	const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([]);
	const [completedSends, setCompletedSends] = useState<CompletedTransfer[]>([]);
	const [pendingOffers, setPendingOffers] = useState<IncomingFileOffer[]>([]);

	const isPeerJoined = session?.status === "peer_joined";
	const isPolite = session?.participants[0]?.id === yourId;

	const getPeerNameRef = useRef<() => string>(() => "Peer");
	getPeerNameRef.current = () => {
		if (!session || !yourId) return "Peer";
		const peer = session.participants.find((p) => p.id !== yourId);
		return peer?.name ?? "Peer";
	};

	// Track receive start times for duration calculation
	const receiveStartTimesRef = useRef<Map<string, number>>(new Map());

	useEffect(() => {
		if (!isPeerJoined || !yourId) return;

		const pc = new PeerConnection(sendSignal, isPolite);
		pcRef.current = pc;

		pc.onDataChannelOpen = () => setChannelOpen(true);
		pc.onDataChannelClose = () => setChannelOpen(false);

		pc.onProgress = (progress) => {
			// Track receive start time
			if (progress.direction === "receive" && progress.startedAt) {
				receiveStartTimesRef.current.set(progress.fileId, progress.startedAt);
			}

			if (progress.status === "complete") {
				if (progress.direction === "send") {
					setCompletedSends((prev) => [
						...prev,
						{
							fileId: progress.fileId,
							fileName: progress.fileName,
							fileSize: progress.fileSize,
							durationMs:
								progress.startedAt && progress.completedAt
									? progress.completedAt - progress.startedAt
									: 0,
						},
					]);
				}
				setTransfers((prev) => {
					const next = new Map(prev);
					next.delete(progress.fileId);
					return next;
				});
			} else {
				setTransfers((prev) => {
					const next = new Map(prev);
					next.set(progress.fileId, progress);
					return next;
				});
			}
		};

		pc.onFileReceived = (blob, fileName, fileId) => {
			const startedAt = receiveStartTimesRef.current.get(fileId) ?? Date.now();
			const durationMs = Date.now() - startedAt;
			receiveStartTimesRef.current.delete(fileId);
			setReceivedFiles((prev) => [
				...prev,
				{ fileId, fileName, blob, senderName: getPeerNameRef.current(), durationMs },
			]);
		};

		pc.onTransferCancelled = (fileId, direction) => {
			setTransfers((prev) => {
				const next = new Map(prev);
				next.delete(fileId);
				return next;
			});
			if (direction === "send") {
				pendingSendRef.current.delete(fileId);
			}
		};

		pc.connect();

		onSignal((_from, data) => {
			pc.handleSignal(data);
		});

		onFileOffer((offer) => {
			setPendingOffers((prev) => [...prev, offer]);
		});

		onFileAccept((_from, fileId) => {
			const file = pendingSendRef.current.get(fileId);
			if (file) {
				pendingSendRef.current.delete(fileId);
				pc.sendFile(file, fileId);
			}
		});

		onFileReject((_from, fileId) => {
			pendingSendRef.current.delete(fileId);
			setTransfers((prev) => {
				const next = new Map(prev);
				next.delete(fileId);
				return next;
			});
		});

		onTransferPause((_from, fileId) => {
			// Remote paused — pause our side too
			pc.pauseSend(fileId);
			pc.pauseReceive(fileId);
		});

		onTransferResume((_from, fileId) => {
			pc.resumeSend(fileId);
			pc.resumeReceive(fileId);
		});

		onTransferCancel((_from, fileId) => {
			pc.cancelSend(fileId);
			pc.cancelReceive(fileId);
			setTransfers((prev) => {
				const next = new Map(prev);
				next.delete(fileId);
				return next;
			});
		});

		return () => {
			pc.close();
			pcRef.current = null;
			setChannelOpen(false);
		};
	}, [
		isPeerJoined,
		isPolite,
		yourId,
		sendSignal,
		onSignal,
		onFileOffer,
		onFileAccept,
		onFileReject,
		onTransferPause,
		onTransferResume,
		onTransferCancel,
	]);

	const handleFileSelected = useCallback(
		(file: File) => {
			const fileId = crypto.randomUUID();
			pendingSendRef.current.set(fileId, file);

			setTransfers((prev) => {
				const next = new Map(prev);
				next.set(fileId, {
					fileId,
					fileName: file.name,
					fileSize: file.size,
					transferred: 0,
					direction: "send",
					status: "pending",
					startedAt: null,
					completedAt: null,
				});
				return next;
			});

			sendFileOffer(fileId, file.name, file.size, file.type);
		},
		[sendFileOffer],
	);

	const handleAcceptOffer = useCallback(
		(offer: IncomingFileOffer) => {
			sendFileAccept(offer.fileId);
			setPendingOffers((prev) => prev.filter((o) => o.fileId !== offer.fileId));
		},
		[sendFileAccept],
	);

	const handleRejectOffer = useCallback(
		(offer: IncomingFileOffer) => {
			sendFileReject(offer.fileId);
			setPendingOffers((prev) => prev.filter((o) => o.fileId !== offer.fileId));
		},
		[sendFileReject],
	);

	const handlePause = useCallback(
		(fileId: string) => {
			const pc = pcRef.current;
			if (!pc) return;
			const t = transfers.get(fileId);
			if (!t) return;
			if (t.direction === "send") {
				pc.pauseSend(fileId);
			} else {
				pc.pauseReceive(fileId);
			}
			sendTransferPause(fileId);
		},
		[transfers, sendTransferPause],
	);

	const handleResume = useCallback(
		(fileId: string) => {
			const pc = pcRef.current;
			if (!pc) return;
			const t = transfers.get(fileId);
			if (!t) return;
			if (t.direction === "send") {
				pc.resumeSend(fileId);
			} else {
				pc.resumeReceive(fileId);
			}
			sendTransferResume(fileId);
		},
		[transfers, sendTransferResume],
	);

	const handleCancel = useCallback(
		(fileId: string) => {
			const pc = pcRef.current;
			if (!pc) return;
			const t = transfers.get(fileId);
			if (!t) return;
			if (t.direction === "send") {
				pc.cancelSend(fileId);
			} else {
				pc.cancelReceive(fileId);
			}
			sendTransferCancel(fileId);
			setTransfers((prev) => {
				const next = new Map(prev);
				next.delete(fileId);
				return next;
			});
		},
		[transfers, sendTransferCancel],
	);

	const removeCompletedSend = useCallback((fileId: string) => {
		setCompletedSends((prev) => prev.filter((t) => t.fileId !== fileId));
	}, []);

	const removeReceivedFile = useCallback((fileId: string) => {
		setReceivedFiles((prev) => prev.filter((f) => f.fileId !== fileId));
	}, []);

	const handleCancelSession = useCallback(() => {
		navigate("/");
	}, [navigate]);

	if (error) {
		return (
			<div className="flex flex-col items-center gap-4">
				<p className="text-red-400">{error}</p>
			</div>
		);
	}

	if (!connected || !session || !yourId) {
		return <p className="text-neutral-400">Connecting...</p>;
	}

	const you = session.participants.find((p) => p.id === yourId);
	const hasName = you?.name != null;

	if (!hasName) {
		return <NameEntry onSubmit={sendName} />;
	}

	const activeTransfers = Array.from(transfers.values());
	const isTransferring = activeTransfers.some(
		(t) => t.status === "transferring" || t.status === "paused",
	);

	const sendingTransfers = activeTransfers.filter((t) => t.direction === "send");
	const receivingTransfers = activeTransfers.filter((t) => t.direction === "receive");

	return (
		<div className="flex w-full max-w-md flex-col items-center gap-6">
			<PresenceDisplay
				session={session}
				yourId={yourId}
				onCancel={session.status !== "peer_joined" ? handleCancelSession : undefined}
			/>

			{/* Incoming file offers requiring confirmation */}
			{pendingOffers.map((offer) => (
				<IncomingOffer
					key={offer.fileId}
					fileName={offer.fileName}
					fileSize={offer.fileSize}
					senderName={getPeerNameRef.current()}
					onAccept={() => handleAcceptOffer(offer)}
					onReject={() => handleRejectOffer(offer)}
				/>
			))}

			{/* File picker — visible when connected and not actively transferring */}
			{session.status === "peer_joined" && channelOpen && !isTransferring && (
				<FilePicker onFileSelected={handleFileSelected} />
			)}

			{session.status === "peer_joined" && !channelOpen && (
				<p className="text-sm text-neutral-500">Establishing peer connection...</p>
			)}

			{/* Sending */}
			{sendingTransfers.length > 0 && (
				<div className="flex w-full flex-col gap-2">
					<p className="text-sm font-medium text-blue-400">Sending</p>
					{sendingTransfers.map((t) => (
						<TransferProgress
							key={t.fileId}
							fileName={t.fileName}
							fileSize={t.fileSize}
							transferred={t.transferred}
							direction={t.direction}
							status={t.status}
							startedAt={t.startedAt}
							completedAt={t.completedAt}
							onPause={() => handlePause(t.fileId)}
							onResume={() => handleResume(t.fileId)}
							onCancel={() => handleCancel(t.fileId)}
						/>
					))}
				</div>
			)}

			{/* Receiving */}
			{receivingTransfers.length > 0 && (
				<div className="flex w-full flex-col gap-2">
					<p className="text-sm font-medium text-green-400">Receiving</p>
					{receivingTransfers.map((t) => (
						<TransferProgress
							key={t.fileId}
							fileName={t.fileName}
							fileSize={t.fileSize}
							transferred={t.transferred}
							direction={t.direction}
							status={t.status}
							startedAt={t.startedAt}
							completedAt={t.completedAt}
							onPause={() => handlePause(t.fileId)}
							onResume={() => handleResume(t.fileId)}
							onCancel={() => handleCancel(t.fileId)}
						/>
					))}
				</div>
			)}

			{/* Completed sends */}
			<CompletedTransfers transfers={completedSends} onRemove={removeCompletedSend} />

			{/* Received files */}
			<ReceivedFiles files={receivedFiles} onRemove={removeReceivedFile} />
		</div>
	);
}

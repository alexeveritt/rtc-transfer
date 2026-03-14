import { useCallback, useEffect, useRef, useState } from "react";
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
		onSignal,
		onFileOffer,
		onFileAccept,
		onFileReject,
	} = useSession();

	const pcRef = useRef<PeerConnection | null>(null);
	const pendingSendRef = useRef<Map<string, File>>(new Map());

	const [channelOpen, setChannelOpen] = useState(false);
	const [transfers, setTransfers] = useState<Map<string, FileTransferProgress>>(new Map());
	const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([]);
	const [completedSends, setCompletedSends] = useState<CompletedTransfer[]>([]);
	const [pendingOffers, setPendingOffers] = useState<IncomingFileOffer[]>([]);

	const isPeerJoined = session?.status === "peer_joined";
	const isPolite = session?.participants[0]?.id === yourId;

	const getPeerName = useCallback(() => {
		if (!session || !yourId) return "Peer";
		const peer = session.participants.find((p) => p.id !== yourId);
		return peer?.name ?? "Peer";
	}, [session, yourId]);

	// Set up WebRTC when both peers are connected
	useEffect(() => {
		if (!isPeerJoined || !yourId) return;

		const pc = new PeerConnection(sendSignal, isPolite);
		pcRef.current = pc;

		pc.onDataChannelOpen = () => setChannelOpen(true);
		pc.onDataChannelClose = () => setChannelOpen(false);

		pc.onProgress = (progress) => {
			if (progress.status === "complete") {
				if (progress.direction === "send") {
					// Move to completed sends
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
					setTransfers((prev) => {
						const next = new Map(prev);
						next.delete(progress.fileId);
						return next;
					});
				} else {
					// Receive complete — remove from active transfers
					setTransfers((prev) => {
						const next = new Map(prev);
						next.delete(progress.fileId);
						return next;
					});
				}
			} else {
				setTransfers((prev) => {
					const next = new Map(prev);
					next.set(progress.fileId, progress);
					return next;
				});
			}
		};

		pc.onFileReceived = (blob, fileName, fileId) => {
			setReceivedFiles((prev) => [...prev, { fileId, fileName, blob, senderName: getPeerName() }]);
		};

		pc.connect();

		onSignal((_from, data) => {
			pc.handleSignal(data);
		});

		// Show incoming file offers for confirmation
		onFileOffer((offer) => {
			setPendingOffers((prev) => [...prev, offer]);
		});

		// Peer accepted — start sending
		onFileAccept((_from, fileId) => {
			const file = pendingSendRef.current.get(fileId);
			if (file) {
				pendingSendRef.current.delete(fileId);
				pc.sendFile(file, fileId);
			}
		});

		// Peer rejected
		onFileReject((_from, fileId) => {
			pendingSendRef.current.delete(fileId);
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
		getPeerName,
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

	const removeCompletedSend = useCallback((fileId: string) => {
		setCompletedSends((prev) => prev.filter((t) => t.fileId !== fileId));
	}, []);

	const removeReceivedFile = useCallback((fileId: string) => {
		setReceivedFiles((prev) => prev.filter((f) => f.fileId !== fileId));
	}, []);

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
	const isTransferring = activeTransfers.some((t) => t.status === "transferring");

	return (
		<div className="flex w-full max-w-md flex-col items-center gap-6">
			<PresenceDisplay session={session} yourId={yourId} />

			{/* Incoming file offers requiring confirmation */}
			{pendingOffers.map((offer) => (
				<IncomingOffer
					key={offer.fileId}
					fileName={offer.fileName}
					fileSize={offer.fileSize}
					senderName={getPeerName()}
					onAccept={() => handleAcceptOffer(offer)}
					onReject={() => handleRejectOffer(offer)}
				/>
			))}

			{/* File picker — hidden while transferring */}
			{session.status === "peer_joined" && channelOpen && !isTransferring && (
				<FilePicker onFileSelected={handleFileSelected} />
			)}

			{session.status === "peer_joined" && !channelOpen && (
				<p className="text-sm text-neutral-500">Establishing peer connection...</p>
			)}

			{/* Active transfers */}
			{activeTransfers.length > 0 && (
				<div className="flex w-full flex-col gap-2">
					<p className="text-sm font-medium text-neutral-400">Transfers</p>
					{activeTransfers.map((t) => (
						<TransferProgress
							key={t.fileId}
							fileName={t.fileName}
							fileSize={t.fileSize}
							transferred={t.transferred}
							direction={t.direction}
							status={t.status}
							startedAt={t.startedAt}
							completedAt={t.completedAt}
						/>
					))}
				</div>
			)}

			{/* Completed sends (sender side) */}
			<CompletedTransfers transfers={completedSends} onRemove={removeCompletedSend} />

			{/* Received files (recipient side) */}
			<ReceivedFiles files={receivedFiles} onRemove={removeReceivedFile} />
		</div>
	);
}

import { useCallback, useEffect, useRef, useState } from "react";
import type { FileTransferProgress } from "../lib/webrtc";
import { PeerConnection } from "../lib/webrtc";
import { FilePicker } from "./file-picker";
import { NameEntry } from "./name-entry";
import { PresenceDisplay } from "./presence-display";
import { ReceivedFiles } from "./received-files";
import { useSession } from "./session-provider";
import { TransferProgress } from "./transfer-progress";

interface ReceivedFile {
	fileId: string;
	fileName: string;
	blob: Blob;
}

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
		onSignal,
		onFileOffer,
		onFileAccept,
	} = useSession();

	const pcRef = useRef<PeerConnection | null>(null);
	const pendingSendRef = useRef<Map<string, File>>(new Map());

	const [channelOpen, setChannelOpen] = useState(false);
	const [transfers, setTransfers] = useState<Map<string, FileTransferProgress>>(new Map());
	const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([]);

	const isPeerJoined = session?.status === "peer_joined";
	const isPolite = session?.participants[0]?.id === yourId;

	// Set up WebRTC when both peers are connected
	useEffect(() => {
		if (!isPeerJoined || !yourId) return;

		const pc = new PeerConnection(sendSignal, isPolite);
		pcRef.current = pc;

		pc.onDataChannelOpen = () => setChannelOpen(true);
		pc.onDataChannelClose = () => setChannelOpen(false);

		pc.onProgress = (progress) => {
			setTransfers((prev) => {
				const next = new Map(prev);
				next.set(progress.fileId, progress);
				return next;
			});
		};

		pc.onFileReceived = (blob, fileName, fileId) => {
			setReceivedFiles((prev) => [...prev, { fileId, fileName, blob }]);
		};

		pc.connect();

		// Register signal handler
		onSignal((_from, data) => {
			pc.handleSignal(data);
		});

		// Register file offer handler - auto-accept
		onFileOffer((offer) => {
			sendFileAccept(offer.fileId);
		});

		// Register file accept handler - start sending the file
		onFileAccept((_from, fileId) => {
			const file = pendingSendRef.current.get(fileId);
			if (file) {
				pendingSendRef.current.delete(fileId);
				pc.sendFile(file, fileId);
			}
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
		sendFileAccept,
	]);

	const handleFileSelected = useCallback(
		(file: File) => {
			const fileId = crypto.randomUUID();
			pendingSendRef.current.set(fileId, file);

			// Set initial pending progress
			setTransfers((prev) => {
				const next = new Map(prev);
				next.set(fileId, {
					fileId,
					fileName: file.name,
					fileSize: file.size,
					transferred: 0,
					direction: "send",
					status: "pending",
				});
				return next;
			});

			// Send offer through signalling
			sendFileOffer(fileId, file.name, file.size, file.type);
		},
		[sendFileOffer],
	);

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

	const transferList = Array.from(transfers.values());

	return (
		<div className="flex w-full max-w-lg flex-col items-center gap-6">
			<PresenceDisplay session={session} yourId={yourId} />

			{session.status === "peer_joined" && channelOpen && (
				<FilePicker onFileSelected={handleFileSelected} disabled={!channelOpen} />
			)}

			{session.status === "peer_joined" && !channelOpen && (
				<p className="text-sm text-neutral-500">Establishing peer connection...</p>
			)}

			{transferList.length > 0 && (
				<div className="flex w-full flex-col gap-2">
					<p className="text-sm font-medium text-neutral-400">Transfers</p>
					{transferList.map((t) => (
						<TransferProgress
							key={t.fileId}
							fileName={t.fileName}
							fileSize={t.fileSize}
							transferred={t.transferred}
							direction={t.direction}
							status={t.status}
						/>
					))}
				</div>
			)}

			<ReceivedFiles files={receivedFiles} />
		</div>
	);
}

const RTC_CONFIG: RTCConfiguration = {
	iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const CHUNK_SIZE = 64 * 1024; // 64KB chunks

export type SendSignal = (data: { type: string; payload: unknown }) => void;

export interface FileTransferProgress {
	fileId: string;
	fileName: string;
	fileSize: number;
	transferred: number;
	direction: "send" | "receive";
	status: "pending" | "transferring" | "complete" | "error";
}

export interface IncomingFileOffer {
	fileId: string;
	fileName: string;
	fileSize: number;
	fileType: string;
	from: string;
}

export class PeerConnection {
	private pc: RTCPeerConnection | null = null;
	private dataChannel: RTCDataChannel | null = null;
	private sendSignal: SendSignal;
	private makingOffer = false;
	private isPolite: boolean;

	private currentSend: {
		fileId: string;
		file: File;
		transferred: number;
	} | null = null;

	private currentReceive: {
		fileId: string;
		fileName: string;
		fileSize: number;
		fileType: string;
		chunks: Uint8Array[];
		transferred: number;
	} | null = null;

	onProgress?: (progress: FileTransferProgress) => void;
	onFileReceived?: (file: Blob, fileName: string, fileId: string) => void;
	onDataChannelOpen?: () => void;
	onDataChannelClose?: () => void;

	constructor(sendSignal: SendSignal, isPolite: boolean) {
		this.sendSignal = sendSignal;
		this.isPolite = isPolite;
	}

	async connect(): Promise<void> {
		const pc = new RTCPeerConnection(RTC_CONFIG);
		this.pc = pc;

		pc.onicecandidate = (event) => {
			if (event.candidate) {
				this.sendSignal({
					type: "ice-candidate",
					payload: event.candidate.toJSON(),
				});
			}
		};

		pc.onnegotiationneeded = async () => {
			try {
				this.makingOffer = true;
				await pc.setLocalDescription();
				this.sendSignal({
					type: "offer",
					payload: pc.localDescription?.toJSON(),
				});
			} catch (err) {
				console.error("Negotiation error:", err);
			} finally {
				this.makingOffer = false;
			}
		};

		if (!this.isPolite) {
			this.setupDataChannel(pc.createDataChannel("file-transfer", { ordered: true }));
		}

		pc.ondatachannel = (event) => {
			this.setupDataChannel(event.channel);
		};
	}

	private setupDataChannel(channel: RTCDataChannel): void {
		channel.binaryType = "arraybuffer";
		this.dataChannel = channel;

		channel.onopen = () => {
			this.onDataChannelOpen?.();
		};

		channel.onclose = () => {
			this.onDataChannelClose?.();
		};

		channel.onmessage = (event) => {
			this.handleDataChannelMessage(event);
		};
	}

	async handleSignal(data: { type: string; payload: unknown }): Promise<void> {
		const pc = this.pc;
		if (!pc) return;

		try {
			if (data.type === "offer" || data.type === "answer") {
				const description = data.payload as RTCSessionDescriptionInit;
				const offerCollision =
					data.type === "offer" && (this.makingOffer || pc.signalingState !== "stable");

				if (offerCollision && !this.isPolite) {
					return;
				}

				await pc.setRemoteDescription(description);

				if (data.type === "offer") {
					await pc.setLocalDescription();
					this.sendSignal({
						type: "answer",
						payload: pc.localDescription?.toJSON(),
					});
				}
			} else if (data.type === "ice-candidate") {
				const candidate = data.payload as RTCIceCandidateInit;
				await pc.addIceCandidate(candidate);
			}
		} catch (err) {
			console.error("Signal handling error:", err);
		}
	}

	async sendFile(file: File, fileId: string): Promise<void> {
		const dc = this.dataChannel;
		if (!dc || dc.readyState !== "open") {
			throw new Error("Data channel not open");
		}

		const send = { fileId, file, transferred: 0 };
		this.currentSend = send;

		dc.send(
			JSON.stringify({
				type: "file-start",
				fileId,
				fileName: file.name,
				fileSize: file.size,
				fileType: file.type,
			}),
		);

		const reader = file.stream().getReader();
		let buffer = new Uint8Array(0);

		while (true) {
			const { done, value } = await reader.read();

			if (value) {
				const newBuffer = new Uint8Array(buffer.length + value.length);
				newBuffer.set(buffer);
				newBuffer.set(value, buffer.length);
				buffer = newBuffer;
			}

			while (buffer.length >= CHUNK_SIZE) {
				const chunk = buffer.slice(0, CHUNK_SIZE);
				buffer = buffer.slice(CHUNK_SIZE);

				await this.waitForBufferDrain();
				dc.send(chunk);
				send.transferred += chunk.length;

				this.onProgress?.({
					fileId,
					fileName: file.name,
					fileSize: file.size,
					transferred: send.transferred,
					direction: "send",
					status: "transferring",
				});
			}

			if (done) break;
		}

		if (buffer.length > 0) {
			await this.waitForBufferDrain();
			dc.send(buffer);
			send.transferred += buffer.length;
		}

		dc.send(JSON.stringify({ type: "file-end", fileId }));

		this.onProgress?.({
			fileId,
			fileName: file.name,
			fileSize: file.size,
			transferred: file.size,
			direction: "send",
			status: "complete",
		});

		this.currentSend = null;
	}

	private async waitForBufferDrain(): Promise<void> {
		const dc = this.dataChannel;
		if (!dc) return;

		const threshold = 1024 * 1024; // 1MB
		while (dc.bufferedAmount > threshold) {
			await new Promise((resolve) => setTimeout(resolve, 10));
		}
	}

	private handleDataChannelMessage(event: MessageEvent): void {
		if (typeof event.data === "string") {
			const msg = JSON.parse(event.data);

			if (msg.type === "file-start") {
				this.currentReceive = {
					fileId: msg.fileId,
					fileName: msg.fileName,
					fileSize: msg.fileSize,
					fileType: msg.fileType,
					chunks: [],
					transferred: 0,
				};
				this.onProgress?.({
					fileId: msg.fileId,
					fileName: msg.fileName,
					fileSize: msg.fileSize,
					transferred: 0,
					direction: "receive",
					status: "transferring",
				});
			} else if (msg.type === "file-end" && this.currentReceive) {
				const recv = this.currentReceive;
				const blob = new Blob(recv.chunks as BlobPart[], { type: recv.fileType });
				this.onProgress?.({
					fileId: recv.fileId,
					fileName: recv.fileName,
					fileSize: recv.fileSize,
					transferred: recv.fileSize,
					direction: "receive",
					status: "complete",
				});
				this.onFileReceived?.(blob, recv.fileName, recv.fileId);
				this.currentReceive = null;
			}
		} else if (event.data instanceof ArrayBuffer && this.currentReceive) {
			const chunk = new Uint8Array(event.data);
			this.currentReceive.chunks.push(chunk);
			this.currentReceive.transferred += chunk.length;

			this.onProgress?.({
				fileId: this.currentReceive.fileId,
				fileName: this.currentReceive.fileName,
				fileSize: this.currentReceive.fileSize,
				transferred: this.currentReceive.transferred,
				direction: "receive",
				status: "transferring",
			});
		}
	}

	close(): void {
		this.dataChannel?.close();
		this.pc?.close();
		this.pc = null;
		this.dataChannel = null;
	}
}

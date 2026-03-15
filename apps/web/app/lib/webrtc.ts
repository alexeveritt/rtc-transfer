const RTC_CONFIG: RTCConfiguration = {
	iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const CHUNK_SIZE = 64 * 1024;

export type SendSignal = (data: { type: string; payload: unknown }) => void;

export interface FileTransferProgress {
	fileId: string;
	fileName: string;
	fileSize: number;
	transferred: number;
	direction: "send" | "receive";
	status: "pending" | "transferring" | "paused" | "complete" | "cancelled" | "error";
	startedAt: number | null;
	completedAt: number | null;
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
		startedAt: number;
		paused: boolean;
		cancelled: boolean;
		reader: ReadableStreamDefaultReader<Uint8Array> | null;
	} | null = null;

	private currentReceive: {
		fileId: string;
		fileName: string;
		fileSize: number;
		fileType: string;
		chunks: Uint8Array[];
		transferred: number;
		startedAt: number;
		paused: boolean;
	} | null = null;

	onProgress?: (progress: FileTransferProgress) => void;
	onFileReceived?: (file: Blob, fileName: string, fileId: string) => void;
	onDataChannelOpen?: () => void;
	onDataChannelClose?: () => void;
	onTransferCancelled?: (fileId: string, direction: "send" | "receive") => void;

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

	pauseSend(fileId: string): void {
		if (this.currentSend?.fileId === fileId) {
			this.currentSend.paused = true;
			this.onProgress?.({
				fileId,
				fileName: this.currentSend.file.name,
				fileSize: this.currentSend.file.size,
				transferred: this.currentSend.transferred,
				direction: "send",
				status: "paused",
				startedAt: this.currentSend.startedAt,
				completedAt: null,
			});
		}
	}

	resumeSend(fileId: string): void {
		if (this.currentSend?.fileId === fileId) {
			this.currentSend.paused = false;
			this.onProgress?.({
				fileId,
				fileName: this.currentSend.file.name,
				fileSize: this.currentSend.file.size,
				transferred: this.currentSend.transferred,
				direction: "send",
				status: "transferring",
				startedAt: this.currentSend.startedAt,
				completedAt: null,
			});
		}
	}

	cancelSend(fileId: string): void {
		if (this.currentSend?.fileId === fileId) {
			this.currentSend.cancelled = true;
			this.currentSend.paused = false; // unblock the loop
			this.dataChannel?.send(JSON.stringify({ type: "file-cancel", fileId }));
		}
	}

	cancelReceive(fileId: string): void {
		if (this.currentReceive?.fileId === fileId) {
			this.currentReceive = null;
			this.dataChannel?.send(JSON.stringify({ type: "file-cancel", fileId }));
			this.onTransferCancelled?.(fileId, "receive");
		}
	}

	// Pause receive just sets a flag — chunks still arrive but we note state
	pauseReceive(fileId: string): void {
		if (this.currentReceive?.fileId === fileId) {
			this.currentReceive.paused = true;
			this.onProgress?.({
				fileId,
				fileName: this.currentReceive.fileName,
				fileSize: this.currentReceive.fileSize,
				transferred: this.currentReceive.transferred,
				direction: "receive",
				status: "paused",
				startedAt: this.currentReceive.startedAt,
				completedAt: null,
			});
		}
	}

	resumeReceive(fileId: string): void {
		if (this.currentReceive?.fileId === fileId) {
			this.currentReceive.paused = false;
			this.onProgress?.({
				fileId,
				fileName: this.currentReceive.fileName,
				fileSize: this.currentReceive.fileSize,
				transferred: this.currentReceive.transferred,
				direction: "receive",
				status: "transferring",
				startedAt: this.currentReceive.startedAt,
				completedAt: null,
			});
		}
	}

	async sendFile(file: File, fileId: string): Promise<void> {
		const dc = this.dataChannel;
		if (!dc || dc.readyState !== "open") {
			throw new Error("Data channel not open");
		}

		const startedAt = Date.now();
		const send = {
			fileId,
			file,
			transferred: 0,
			startedAt,
			paused: false,
			cancelled: false,
			reader: null as ReadableStreamDefaultReader<Uint8Array> | null,
		};
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
		send.reader = reader;
		let buffer = new Uint8Array(0);

		try {
			while (true) {
				// Check cancelled
				if (send.cancelled) {
					reader.cancel();
					this.onTransferCancelled?.(fileId, "send");
					this.currentSend = null;
					return;
				}

				// Wait while paused
				while (send.paused) {
					await new Promise((resolve) => setTimeout(resolve, 100));
					if (send.cancelled) {
						reader.cancel();
						this.onTransferCancelled?.(fileId, "send");
						this.currentSend = null;
						return;
					}
				}

				const { done, value } = await reader.read();

				if (value) {
					const newBuffer = new Uint8Array(buffer.length + value.length);
					newBuffer.set(buffer);
					newBuffer.set(value, buffer.length);
					buffer = newBuffer;
				}

				while (buffer.length >= CHUNK_SIZE) {
					if (send.cancelled) {
						reader.cancel();
						this.onTransferCancelled?.(fileId, "send");
						this.currentSend = null;
						return;
					}

					while (send.paused) {
						await new Promise((resolve) => setTimeout(resolve, 100));
						if (send.cancelled) {
							reader.cancel();
							this.onTransferCancelled?.(fileId, "send");
							this.currentSend = null;
							return;
						}
					}

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
						startedAt,
						completedAt: null,
					});
				}

				if (done) break;
			}

			if (send.cancelled) {
				this.onTransferCancelled?.(fileId, "send");
				this.currentSend = null;
				return;
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
				startedAt,
				completedAt: Date.now(),
			});
		} finally {
			this.currentSend = null;
		}
	}

	private async waitForBufferDrain(): Promise<void> {
		const dc = this.dataChannel;
		if (!dc) return;

		const threshold = 1024 * 1024;
		while (dc.bufferedAmount > threshold) {
			await new Promise((resolve) => setTimeout(resolve, 10));
		}
	}

	private handleDataChannelMessage(event: MessageEvent): void {
		if (typeof event.data === "string") {
			const msg = JSON.parse(event.data);

			if (msg.type === "file-start") {
				const startedAt = Date.now();
				this.currentReceive = {
					fileId: msg.fileId,
					fileName: msg.fileName,
					fileSize: msg.fileSize,
					fileType: msg.fileType,
					chunks: [],
					transferred: 0,
					startedAt,
					paused: false,
				};
				this.onProgress?.({
					fileId: msg.fileId,
					fileName: msg.fileName,
					fileSize: msg.fileSize,
					transferred: 0,
					direction: "receive",
					status: "transferring",
					startedAt,
					completedAt: null,
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
					startedAt: recv.startedAt,
					completedAt: Date.now(),
				});
				this.onFileReceived?.(blob, recv.fileName, recv.fileId);
				this.currentReceive = null;
			} else if (msg.type === "file-cancel") {
				// Other side cancelled
				if (this.currentReceive?.fileId === msg.fileId) {
					this.currentReceive = null;
					this.onTransferCancelled?.(msg.fileId, "receive");
				}
				if (this.currentSend && this.currentSend.fileId === msg.fileId) {
					this.currentSend.cancelled = true;
					this.currentSend.paused = false;
				}
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
				status: this.currentReceive.paused ? "paused" : "transferring",
				startedAt: this.currentReceive.startedAt,
				completedAt: null,
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

import * as v from "valibot";

// Client messages
export interface SetNameMessage {
	type: "set_name";
	name: string;
}

export interface PingMessage {
	type: "ping";
}

export interface SignalMessage {
	type: "signal";
	data: {
		type: "offer" | "answer" | "ice-candidate";
		payload: unknown;
	};
}

export interface FileOfferMessage {
	type: "file_offer";
	fileId: string;
	fileName: string;
	fileSize: number;
	fileType: string;
}

export interface FileAcceptMessage {
	type: "file_accept";
	fileId: string;
}

export interface FileRejectMessage {
	type: "file_reject";
	fileId: string;
}

export type ClientMessage =
	| SetNameMessage
	| PingMessage
	| SignalMessage
	| FileOfferMessage
	| FileAcceptMessage
	| FileRejectMessage;

export const SetNameSchema = v.object({
	type: v.literal("set_name"),
	name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(40)),
});

export const PingSchema = v.object({
	type: v.literal("ping"),
});

export const SignalSchema = v.object({
	type: v.literal("signal"),
	data: v.object({
		type: v.union([v.literal("offer"), v.literal("answer"), v.literal("ice-candidate")]),
		payload: v.unknown(),
	}),
});

export const FileOfferSchema = v.object({
	type: v.literal("file_offer"),
	fileId: v.string(),
	fileName: v.string(),
	fileSize: v.number(),
	fileType: v.string(),
});

export const FileAcceptSchema = v.object({
	type: v.literal("file_accept"),
	fileId: v.string(),
});

export const FileRejectSchema = v.object({
	type: v.literal("file_reject"),
	fileId: v.string(),
});

export const ClientMessageSchema = v.variant("type", [
	SetNameSchema,
	PingSchema,
	SignalSchema,
	FileOfferSchema,
	FileAcceptSchema,
	FileRejectSchema,
]);

// Server messages
export interface SessionStateMessage {
	type: "session_state";
	session: {
		code: string;
		status: string;
		participants: Array<{
			id: string;
			name: string | null;
			status: string;
		}>;
	};
	yourId: string;
}

export interface ParticipantJoinedMessage {
	type: "participant_joined";
	participant: {
		id: string;
		name: string | null;
		status: string;
	};
}

export interface ParticipantUpdatedMessage {
	type: "participant_updated";
	participant: {
		id: string;
		name: string | null;
		status: string;
	};
}

export interface ParticipantLeftMessage {
	type: "participant_left";
	participantId: string;
}

export interface ErrorMessage {
	type: "error";
	code: string;
	message: string;
}

export interface PongMessage {
	type: "pong";
}

export interface ServerSignalMessage {
	type: "signal";
	from: string;
	data: {
		type: "offer" | "answer" | "ice-candidate";
		payload: unknown;
	};
}

export interface ServerFileOfferMessage {
	type: "file_offer";
	from: string;
	fileId: string;
	fileName: string;
	fileSize: number;
	fileType: string;
}

export interface ServerFileAcceptMessage {
	type: "file_accept";
	from: string;
	fileId: string;
}

export interface ServerFileRejectMessage {
	type: "file_reject";
	from: string;
	fileId: string;
}

export type ServerMessage =
	| SessionStateMessage
	| ParticipantJoinedMessage
	| ParticipantUpdatedMessage
	| ParticipantLeftMessage
	| ErrorMessage
	| PongMessage
	| ServerSignalMessage
	| ServerFileOfferMessage
	| ServerFileAcceptMessage
	| ServerFileRejectMessage;

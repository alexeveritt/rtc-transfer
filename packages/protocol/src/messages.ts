import * as v from "valibot";

// Client messages
export interface SetNameMessage {
	type: "set_name";
	name: string;
}

export interface PingMessage {
	type: "ping";
}

export type ClientMessage = SetNameMessage | PingMessage;

export const SetNameSchema = v.object({
	type: v.literal("set_name"),
	name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(40)),
});

export const PingSchema = v.object({
	type: v.literal("ping"),
});

export const ClientMessageSchema = v.variant("type", [SetNameSchema, PingSchema]);

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

export type ServerMessage =
	| SessionStateMessage
	| ParticipantJoinedMessage
	| ParticipantUpdatedMessage
	| ParticipantLeftMessage
	| ErrorMessage
	| PongMessage;

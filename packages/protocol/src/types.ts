export type SessionStatus = "created" | "waiting_for_peer" | "peer_joined";

export interface SessionState {
	id: string;
	code: string;
	status: SessionStatus;
	createdAt: string;
	expiresAt: string;
}

export interface Session extends SessionState {
	participants: Map<string, Participant>;
}

export interface SessionPublicState {
	code: string;
	status: SessionStatus;
	participants: ParticipantInfo[];
}

export type ParticipantStatus = "connected" | "named";

export interface ParticipantState {
	id: string;
	status: ParticipantStatus;
	name: string | null;
	joinedAt: string;
}

export interface Participant extends ParticipantState {}

export interface ParticipantInfo {
	id: string;
	name: string | null;
	status: ParticipantStatus;
}

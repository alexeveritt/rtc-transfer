import type { SessionPublicState } from "@rtc-transfer/protocol";
import { CodeDisplay, ParticipantBadge } from "@rtc-transfer/ui";

interface PresenceDisplayProps {
	session: SessionPublicState;
	yourId: string;
}

export function PresenceDisplay({ session, yourId }: PresenceDisplayProps) {
	return (
		<div className="flex w-full max-w-md flex-col items-center gap-6">
			<CodeDisplay code={session.code} label="Session Code" />

			<div className="flex w-full flex-col gap-2">
				<p className="text-sm font-medium text-neutral-400">Participants</p>
				{session.participants.map((p) => (
					<ParticipantBadge key={p.id} name={p.name} isYou={p.id === yourId} />
				))}
				{session.participants.length < 2 && (
					<div className="rounded-lg border border-dashed border-neutral-700 px-3 py-2 text-center text-sm text-neutral-500">
						Waiting for peer to join...
					</div>
				)}
			</div>

			{session.status === "peer_joined" && (
				<p className="text-sm text-green-400">Both peers connected.</p>
			)}
		</div>
	);
}

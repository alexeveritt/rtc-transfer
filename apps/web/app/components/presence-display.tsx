import type { SessionPublicState } from "@rtc-transfer/protocol";
import { CodeDisplay, ParticipantBadge } from "@rtc-transfer/ui";
import { Button } from "@rtc-transfer/ui";
import { QrCode } from "./qr-code";

interface PresenceDisplayProps {
	session: SessionPublicState;
	yourId: string;
	onCancel?: () => void;
}

export function PresenceDisplay({ session, yourId, onCancel }: PresenceDisplayProps) {
	const transferUrl =
		typeof window !== "undefined" ? `${window.location.origin}/transfer/${session.code}` : "";

	return (
		<div className="flex w-full max-w-md flex-col items-center gap-6">
			<CodeDisplay code={session.code} label="Session Code" />

			{session.participants.length < 2 && transferUrl && <QrCode url={transferUrl} />}

			<div className="flex w-full flex-col gap-2">
				<p className="text-sm font-medium text-neutral-400">Participants</p>
				{session.participants.map((p) => (
					<ParticipantBadge key={p.id} name={p.name} isYou={p.id === yourId} />
				))}
				{session.participants.length < 2 && (
					<div className="flex flex-col items-center gap-3">
						<div className="w-full rounded-lg border border-dashed border-neutral-700 px-3 py-2 text-center text-sm text-neutral-500">
							Waiting for peer to join...
						</div>
						{onCancel && (
							<Button variant="secondary" onClick={onCancel}>
								Cancel Session
							</Button>
						)}
					</div>
				)}
			</div>

			{session.status === "peer_joined" && (
				<p className="text-sm text-green-400">Both peers connected.</p>
			)}
		</div>
	);
}

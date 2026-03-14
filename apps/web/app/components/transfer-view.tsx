import { NameEntry } from "./name-entry";
import { PresenceDisplay } from "./presence-display";
import { useSession } from "./session-provider";

export function TransferView() {
	const { session, yourId, connected, error, sendName } = useSession();

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

	return <PresenceDisplay session={session} yourId={yourId} />;
}

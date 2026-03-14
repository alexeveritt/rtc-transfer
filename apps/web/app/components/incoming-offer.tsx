import { Button } from "@rtc-transfer/ui";
import { formatBytes } from "./transfer-progress";

interface IncomingOfferProps {
	fileName: string;
	fileSize: number;
	senderName: string;
	onAccept: () => void;
	onReject: () => void;
}

export function IncomingOffer({
	fileName,
	fileSize,
	senderName,
	onAccept,
	onReject,
}: IncomingOfferProps) {
	return (
		<div className="w-full rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
			<p className="text-sm font-medium text-neutral-200">{senderName} wants to send you a file</p>
			<div className="mt-2 flex items-center gap-2 text-sm text-neutral-400">
				<span className="truncate">{fileName}</span>
				<span className="shrink-0">({formatBytes(fileSize)})</span>
			</div>
			<div className="mt-3 flex gap-2">
				<Button onClick={onAccept}>Accept</Button>
				<Button variant="secondary" onClick={onReject}>
					Decline
				</Button>
			</div>
		</div>
	);
}

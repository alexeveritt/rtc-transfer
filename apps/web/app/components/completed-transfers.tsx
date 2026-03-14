import { formatBytes, formatDuration } from "./transfer-progress";

interface CompletedTransfer {
	fileId: string;
	fileName: string;
	fileSize: number;
	durationMs: number;
}

interface CompletedTransfersProps {
	transfers: CompletedTransfer[];
	onRemove: (fileId: string) => void;
}

export type { CompletedTransfer };

export function CompletedTransfers({ transfers, onRemove }: CompletedTransfersProps) {
	if (transfers.length === 0) return null;

	return (
		<div className="flex w-full flex-col gap-2">
			<p className="text-sm font-medium text-neutral-400">Sent Files</p>
			{transfers.map((t) => (
				<div
					key={t.fileId}
					className="flex items-center justify-between rounded-lg bg-neutral-800 px-4 py-3"
				>
					<div className="flex min-w-0 flex-col gap-0.5">
						<span className="truncate text-sm text-neutral-200">{t.fileName}</span>
						<span className="text-xs text-neutral-500">
							{formatBytes(t.fileSize)} \u2022 {formatDuration(t.durationMs)}
						</span>
					</div>
					<button
						type="button"
						onClick={() => onRemove(t.fileId)}
						className="ml-3 shrink-0 text-xs text-neutral-500 transition-colors hover:text-neutral-300"
					>
						Remove
					</button>
				</div>
			))}
		</div>
	);
}

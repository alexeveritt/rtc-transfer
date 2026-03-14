interface TransferProgressProps {
	fileName: string;
	fileSize: number;
	transferred: number;
	direction: "send" | "receive";
	status: "pending" | "transferring" | "complete" | "error";
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
}

export function TransferProgress({
	fileName,
	fileSize,
	transferred,
	direction,
	status,
}: TransferProgressProps) {
	const percent = fileSize > 0 ? Math.min(100, Math.round((transferred / fileSize) * 100)) : 0;

	return (
		<div className="w-full rounded-lg bg-neutral-800 p-4">
			<div className="flex items-center justify-between text-sm">
				<span className="truncate font-medium text-neutral-200">{fileName}</span>
				<span className="ml-2 shrink-0 text-neutral-400">
					{direction === "send" ? "Sending" : "Receiving"}
				</span>
			</div>
			<div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-700">
				<div
					className={`h-full rounded-full transition-all duration-200 ${
						status === "complete" ? "bg-green-500" : "bg-blue-500"
					}`}
					style={{ width: `${percent}%` }}
				/>
			</div>
			<div className="mt-1 flex justify-between text-xs text-neutral-500">
				<span>
					{formatBytes(transferred)} / {formatBytes(fileSize)}
				</span>
				<span>
					{status === "complete" ? "Complete" : status === "error" ? "Error" : `${percent}%`}
				</span>
			</div>
		</div>
	);
}

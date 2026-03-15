import { Button } from "@rtc-transfer/ui";
import { useCallback } from "react";
import { formatBytes, formatDuration } from "./transfer-progress";

interface ReceivedFile {
	fileId: string;
	fileName: string;
	blob: Blob;
	senderName: string;
	durationMs: number;
}

interface ReceivedFilesProps {
	files: ReceivedFile[];
	onRemove: (fileId: string) => void;
}

export type { ReceivedFile };

export function ReceivedFiles({ files, onRemove }: ReceivedFilesProps) {
	const download = useCallback((file: ReceivedFile) => {
		const url = URL.createObjectURL(file.blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = file.fileName;
		a.click();
		URL.revokeObjectURL(url);
	}, []);

	if (files.length === 0) return null;

	return (
		<div className="flex w-full flex-col gap-2">
			<p className="text-sm font-medium text-neutral-400">Received Files</p>
			{files.map((file) => (
				<div
					key={file.fileId}
					className="flex items-center justify-between rounded-lg bg-neutral-800 px-4 py-3"
				>
					<div className="flex min-w-0 flex-col gap-0.5">
						<span className="truncate text-sm text-neutral-200">{file.fileName}</span>
						<span className="text-xs text-neutral-500">
							{formatBytes(file.blob.size)} &bull; {formatDuration(file.durationMs)} &bull; From{" "}
							{file.senderName}
						</span>
					</div>
					<div className="ml-3 flex shrink-0 items-center gap-2">
						<Button variant="secondary" onClick={() => download(file)}>
							Download
						</Button>
						<button
							type="button"
							onClick={() => onRemove(file.fileId)}
							className="text-xs text-neutral-500 transition-colors hover:text-neutral-300"
						>
							Remove
						</button>
					</div>
				</div>
			))}
		</div>
	);
}

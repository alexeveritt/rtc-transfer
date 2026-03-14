import { Button } from "@rtc-transfer/ui";
import { useCallback } from "react";

interface ReceivedFile {
	fileId: string;
	fileName: string;
	blob: Blob;
}

interface ReceivedFilesProps {
	files: ReceivedFile[];
}

export function ReceivedFiles({ files }: ReceivedFilesProps) {
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
					<span className="truncate text-sm text-neutral-200">{file.fileName}</span>
					<Button variant="secondary" onClick={() => download(file)}>
						Download
					</Button>
				</div>
			))}
		</div>
	);
}

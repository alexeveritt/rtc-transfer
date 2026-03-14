import { Button } from "@rtc-transfer/ui";
import { useCallback, useRef, useState } from "react";

interface FilePickerProps {
	onFileSelected: (file: File) => void;
	disabled?: boolean;
}

export function FilePicker({ onFileSelected, disabled }: FilePickerProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);

	const handleFile = useCallback(
		(file: File) => {
			onFileSelected(file);
		},
		[onFileSelected],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);
			const file = e.dataTransfer.files[0];
			if (file) handleFile(file);
		},
		[handleFile],
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	}, []);

	return (
		<div
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			className={`flex flex-col items-center gap-4 rounded-xl border-2 border-dashed p-8 transition-colors ${
				isDragging
					? "border-blue-500 bg-blue-500/10"
					: "border-neutral-700 hover:border-neutral-500"
			} ${disabled ? "pointer-events-none opacity-50" : ""}`}
		>
			<p className="text-sm text-neutral-400">Drag and drop a file here, or</p>
			<Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={disabled}>
				Choose File
			</Button>
			<input
				ref={inputRef}
				type="file"
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) handleFile(file);
				}}
			/>
		</div>
	);
}

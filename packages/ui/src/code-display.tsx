import { useCallback, useState } from "react";

interface CodeDisplayProps {
	code: string;
	label?: string;
}

function ClipboardIcon({ copied }: { copied: boolean }) {
	if (copied) {
		return (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				className="h-5 w-5 text-green-400"
			>
				<title>Copied</title>
				<path
					fillRule="evenodd"
					d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
					clipRule="evenodd"
				/>
			</svg>
		);
	}
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 20 20"
			fill="currentColor"
			className="h-5 w-5 text-neutral-500 transition-colors group-hover:text-neutral-300"
		>
			<title>Copy to clipboard</title>
			<path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
			<path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" />
		</svg>
	);
}

export function CodeDisplay({ code, label }: CodeDisplayProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(() => {
		navigator.clipboard.writeText(code).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}, [code]);

	return (
		<div className="flex flex-col items-center gap-2">
			{label && <p className="text-sm text-neutral-400">{label}</p>}
			<button
				type="button"
				onClick={handleCopy}
				className="group flex cursor-pointer items-center gap-3 rounded-lg px-4 py-2 transition-colors hover:bg-neutral-800"
				title="Copy to clipboard"
			>
				<p className="font-mono text-3xl font-bold tracking-widest text-white">{code}</p>
				<ClipboardIcon copied={copied} />
			</button>
		</div>
	);
}

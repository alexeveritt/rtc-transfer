import { useCallback, useState } from "react";

interface CodeDisplayProps {
	code: string;
	label?: string;
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
				<span className="text-xs text-neutral-500 transition-colors group-hover:text-neutral-300">
					{copied ? "Copied!" : "Copy"}
				</span>
			</button>
		</div>
	);
}

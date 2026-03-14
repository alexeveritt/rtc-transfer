interface CodeDisplayProps {
	code: string;
	label?: string;
}

export function CodeDisplay({ code, label }: CodeDisplayProps) {
	return (
		<div className="flex flex-col items-center gap-2">
			{label && <p className="text-sm text-neutral-400">{label}</p>}
			<p className="font-mono text-3xl font-bold tracking-widest text-white">{code}</p>
		</div>
	);
}

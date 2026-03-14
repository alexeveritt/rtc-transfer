import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
}

export function Input({ label, error, className = "", id, ...props }: InputProps) {
	const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
	return (
		<div className="flex flex-col gap-1.5">
			{label && (
				<label htmlFor={inputId} className="text-sm font-medium text-neutral-300">
					{label}
				</label>
			)}
			<input
				id={inputId}
				className={`rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${error ? "border-red-500" : ""} ${className}`}
				{...props}
			/>
			{error && <p className="text-xs text-red-400">{error}</p>}
		</div>
	);
}

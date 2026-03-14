import { Button, Input } from "@rtc-transfer/ui";
import { useState } from "react";

interface NameEntryProps {
	onSubmit: (name: string) => void;
}

export function NameEntry({ onSubmit }: NameEntryProps) {
	const [name, setName] = useState("");
	const [error, setError] = useState("");

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) {
			setError("Name is required");
			return;
		}
		if (trimmed.length > 40) {
			setError("Name must be 40 characters or less");
			return;
		}
		if (!/^[\w\s\-'.]+$/.test(trimmed)) {
			setError("Name contains invalid characters");
			return;
		}
		onSubmit(trimmed);
	}

	return (
		<form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
			<h2 className="text-xl font-semibold text-white">Enter Your Name</h2>
			<Input
				label="Display Name"
				placeholder="Your name"
				value={name}
				onChange={(e) => {
					setName(e.target.value);
					setError("");
				}}
				error={error}
				maxLength={40}
				autoFocus
			/>
			<Button type="submit">Continue</Button>
		</form>
	);
}

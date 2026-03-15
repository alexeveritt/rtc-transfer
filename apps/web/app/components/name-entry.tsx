import { Button, Input } from "@rtc-transfer/ui";
import { useEffect, useState } from "react";

interface NameEntryProps {
	onSubmit: (name: string) => void;
}

export function NameEntry({ onSubmit }: NameEntryProps) {
	const [name, setName] = useState("");
	const [error, setError] = useState("");
	const [autoSubmitted, setAutoSubmitted] = useState(false);

	useEffect(() => {
		const stored = localStorage.getItem("rtc-transfer-name");
		if (stored) {
			setName(stored);
		}
	}, []);

	useEffect(() => {
		if (name && !autoSubmitted) {
			const stored = localStorage.getItem("rtc-transfer-name");
			if (stored && name === stored) {
				setAutoSubmitted(true);
				localStorage.setItem("rtc-transfer-name", name);
				onSubmit(name);
			}
		}
	}, [name, autoSubmitted, onSubmit]);

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
		localStorage.setItem("rtc-transfer-name", trimmed);
		onSubmit(trimmed);
	}

	const trimmed = name.trim();
	const isDisabled = !trimmed || trimmed.length > 40;

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
			<Button type="submit" disabled={isDisabled}>
				Continue
			</Button>
		</form>
	);
}

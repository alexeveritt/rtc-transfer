import { formatCode, validateCode } from "@rtc-transfer/lib";
import { Button, Input } from "@rtc-transfer/ui";
import { useState } from "react";
import { useNavigate } from "react-router";

export function JoinForm() {
	const navigate = useNavigate();
	const [code, setCode] = useState("");
	const [error, setError] = useState("");

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const val = e.target.value;
		setCode(val);
		setError("");
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!validateCode(code)) {
			setError("Please enter a valid 6-character code");
			return;
		}
		navigate(`/transfer/${formatCode(code)}`);
	}

	return (
		<form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
			<Input
				label="Session Code"
				placeholder="abc-def"
				value={code}
				onChange={handleChange}
				error={error}
				maxLength={7}
				autoFocus
			/>
			<Button type="submit">Join</Button>
		</form>
	);
}

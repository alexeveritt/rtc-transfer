import { Button } from "@rtc-transfer/ui";
import { useState } from "react";
import { useNavigate } from "react-router";

export function CreateSessionButton() {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);

	async function handleClick() {
		setLoading(true);
		try {
			const res = await fetch("/api/session", { method: "POST" });
			if (!res.ok) throw new Error("Failed to create session");
			const data = (await res.json()) as { transferUrl: string };
			navigate(data.transferUrl);
		} catch {
			setLoading(false);
		}
	}

	return (
		<Button onClick={handleClick} disabled={loading}>
			{loading ? "Creating..." : "Start Transfer"}
		</Button>
	);
}

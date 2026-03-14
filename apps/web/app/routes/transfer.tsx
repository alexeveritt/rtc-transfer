import { useParams } from "react-router";
import { SessionProvider } from "../components/session-provider";
import { TransferView } from "../components/transfer-view";

export default function Transfer() {
	const { code } = useParams<"code">();
	if (!code) return <p>Invalid session code</p>;
	return (
		<main className="flex min-h-screen flex-col items-center justify-center px-4">
			<SessionProvider code={code}>
				<TransferView />
			</SessionProvider>
		</main>
	);
}

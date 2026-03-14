import { Button } from "@rtc-transfer/ui";
import { Link } from "react-router";
import { CreateSessionButton } from "../components/create-session-button";

export default function Home() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center px-4">
			<div className="mx-auto flex max-w-2xl flex-col items-center gap-8 text-center">
				<h1 className="text-5xl font-bold tracking-tight text-white">Peer-to-Peer File Transfer</h1>
				<p className="text-lg text-neutral-400">
					Send files directly between browsers. No uploads, no accounts, no limits. Just a simple
					code to connect.
				</p>
				<div className="flex flex-col gap-4 sm:flex-row">
					<CreateSessionButton />
					<Link to="/join">
						<Button variant="secondary">Join with Code</Button>
					</Link>
				</div>
				<div className="mt-8 flex gap-6 text-sm text-neutral-500">
					<Link to="/how-it-works" className="hover:text-neutral-300 transition-colors">
						How it works
					</Link>
					<Link to="/privacy" className="hover:text-neutral-300 transition-colors">
						Privacy
					</Link>
					<Link to="/support" className="hover:text-neutral-300 transition-colors">
						Support
					</Link>
				</div>
			</div>
		</main>
	);
}

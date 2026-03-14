import { Link } from "react-router";

export default function HowItWorks() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center px-4">
			<div className="mx-auto max-w-2xl text-center">
				<h1 className="text-3xl font-bold text-white">How It Works</h1>
				<ol className="mt-6 space-y-4 text-left text-neutral-400">
					<li>1. Click "Start Transfer" to create a session and get a code.</li>
					<li>2. Share the code with your peer.</li>
					<li>3. Your peer joins using the code.</li>
					<li>4. Files are sent directly between browsers — no server storage.</li>
				</ol>
				<Link to="/" className="mt-8 inline-block text-blue-400 hover:text-blue-300">
					Back to home
				</Link>
			</div>
		</main>
	);
}

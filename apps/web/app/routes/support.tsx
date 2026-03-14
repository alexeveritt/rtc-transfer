import { Link } from "react-router";

export default function Support() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center px-4">
			<div className="mx-auto max-w-2xl text-center">
				<h1 className="text-3xl font-bold text-white">Support</h1>
				<p className="mt-4 text-neutral-400">
					Need help? This project is open source and community supported.
				</p>
				<Link to="/" className="mt-6 inline-block text-blue-400 hover:text-blue-300">
					Back to home
				</Link>
			</div>
		</main>
	);
}

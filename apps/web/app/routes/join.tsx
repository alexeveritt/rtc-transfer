import { JoinForm } from "../components/join-form";

export default function Join() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center px-4">
			<div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
				<h1 className="text-3xl font-bold text-white">Join a Transfer</h1>
				<p className="text-neutral-400">Enter the code shared by your peer to connect.</p>
				<JoinForm />
			</div>
		</main>
	);
}

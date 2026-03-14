interface ParticipantBadgeProps {
	name: string | null;
	isYou?: boolean;
}

export function ParticipantBadge({ name, isYou }: ParticipantBadgeProps) {
	return (
		<div className="flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2">
			<div className="h-2 w-2 rounded-full bg-green-500" />
			<span className="text-sm text-neutral-200">
				{name ?? "Connecting..."}
				{isYou && <span className="ml-1 text-neutral-500">(you)</span>}
			</span>
		</div>
	);
}

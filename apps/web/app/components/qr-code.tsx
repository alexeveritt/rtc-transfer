interface QrCodeProps {
	url: string;
	size?: number;
}

export function QrCode({ url, size = 160 }: QrCodeProps) {
	const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=171717&color=ffffff&format=svg`;

	return (
		<div className="flex flex-col items-center gap-2">
			<img
				src={qrUrl}
				alt="QR code for session link"
				width={size}
				height={size}
				className="rounded-lg"
			/>
			<p className="text-xs text-neutral-500">Scan to join on another device</p>
		</div>
	);
}

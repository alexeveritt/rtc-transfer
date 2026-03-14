import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
	primary: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500",
	secondary: "bg-neutral-700 text-neutral-100 hover:bg-neutral-600 focus-visible:ring-neutral-500",
};

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
	return (
		<button
			className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${className}`}
			{...props}
		>
			{children}
		</button>
	);
}

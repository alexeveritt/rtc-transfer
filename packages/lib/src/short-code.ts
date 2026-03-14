import { customAlphabet } from "nanoid";

// No ambiguous characters: 0, 1, i, l, o removed
const ALPHABET = "abcdefghjkmnpqrstuvwxyz2345679";
const CODE_LENGTH = 6;

const generate = customAlphabet(ALPHABET, CODE_LENGTH);

export function generateShortCode(): string {
	return formatCode(generate());
}

export function normalizeCode(input: string): string {
	return input
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "")
		.replace(/[0oil1]/g, (c) => {
			const map: Record<string, string> = { "0": "o", o: "o", i: "j", l: "j", "1": "j" };
			return map[c] ?? c;
		});
}

export function formatCode(code: string): string {
	const raw = normalizeCode(code);
	if (raw.length !== CODE_LENGTH) return code;
	const formatted = `${raw.slice(0, 3)}-${raw.slice(3)}`;
	return formatted.toUpperCase();
}

export function validateCode(input: string): boolean {
	const raw = normalizeCode(input);
	return raw.length === CODE_LENGTH && /^[abcdefghjkmnpqrstuvwxyz2345679]+$/.test(raw);
}

export function rawCode(input: string): string {
	return normalizeCode(input);
}

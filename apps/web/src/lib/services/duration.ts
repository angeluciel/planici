// SPEC-0005 R12 (display) and R13 (input). R4's 5-1,440 range is the schema's.

export function formatDuration(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;

	if (hours === 0) return `${rest}min`;
	if (rest === 0) return `${hours}h`;
	return `${hours}h ${rest}min`;
}

const WITH_HOURS = /^(\d+)h(?:(\d+)(?:min)?)?$/;
const MINUTES_ONLY = /^(\d+)(?:min)?$/;

// "1h 30", "1h30min", "2h", "90", "90min": minutes, or null when unreadable.
// With hours given the minutes are 0 to 59.
export function parseDuration(text: string): number | null {
	const compact = text.toLowerCase().replace(/\s+/g, "");

	const withHours = WITH_HOURS.exec(compact);
	if (withHours) {
		const hours = Number(withHours[1]);
		const rest = withHours[2] === undefined ? 0 : Number(withHours[2]);
		return rest > 59 ? null : hours * 60 + rest;
	}

	const minutesOnly = MINUTES_ONLY.exec(compact);
	return minutesOnly ? Number(minutesOnly[1]) : null;
}

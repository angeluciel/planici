import { cn } from "@/lib/utils";

// Help or error line under an input that has none of its own (Select, address).
// Same look as the hint of `Input`.
export function FieldMessage({
	id,
	message,
	tone = "help",
}: Readonly<{ id: string; message?: string; tone?: "help" | "error" }>) {
	return (
		<p
			id={id}
			role={tone === "error" ? "alert" : undefined}
			aria-live="polite"
			className={cn(
				"min-h-5 font-body-sm font-medium",
				tone === "error" ? "text-text-status-danger" : "text-text-secondary",
			)}
		>
			{message}
		</p>
	);
}

import React from "react";
import { type FieldStatus, inputVariants } from "./input";

interface TextareaProps
	extends Omit<React.ComponentPropsWithoutRef<"textarea">, "children"> {
	label?: string;
	help?: string; // Subtitle below the field (or its error)
	status?: FieldStatus;
}

// Multi-line sibling of Input: same label, border, status and hint slots.
export function Textarea({
	label,
	help,
	status = "default",
	className,
	id,
	rows = 4,
	...props
}: Readonly<TextareaProps>) {
	const autoId = React.useId();
	const textareaId = id ?? autoId;
	const hintId = `${textareaId}-hint`;

	const s = inputVariants({ status });

	return (
		<div className={s.root({ class: className })}>
			{label && (
				<label htmlFor={textareaId} className={s.label()}>
					{label}
				</label>
			)}
			<div className={s.textfield({ class: "items-start" })}>
				<textarea
					{...props}
					id={textareaId}
					rows={rows}
					className={s.input({ class: "resize-y" })}
					aria-invalid={status === "error" || undefined}
					aria-describedby={help ? hintId : undefined}
				/>
			</div>

			<p
				id={hintId}
				className={s.hint()}
				role={status === "error" ? "alert" : undefined}
				aria-live="polite"
			>
				{help}
			</p>
		</div>
	);
}

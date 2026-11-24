"use client";

import { type KeyboardEvent, useRef } from "react";

type Props = {
	value: string;
	// its accessible name; the inputs of different cards must differ
	name: string;
	placeholder?: string;
	invalid?: boolean;
	// the message under the card title, while this input's own error is set
	describedBy?: string;
	readOnly?: boolean;
	errorSlot: "label" | "helpText";
	// selects its text when it takes focus, then calls onSelected (§4.1 step 2)
	selectOnFocus?: boolean;
	onSelected?: () => void;
	// typography of the text it replaces
	className?: string;
	onChange: (value: string) => void;
};

const LINE_BREAKS = /\r\n|\r|\n/g;

// The card's title or help text, edited in place on an idle card on wide
// screens (SPEC-0002 §4.6 step 12). A textarea that grows with its text, so
// long text wraps as the card's text does (§11 Decisions 6). It holds one
// line: Enter types no line break and pasted ones become spaces. Escape
// restores the text it had when it took focus. Focus stays in it after Enter
// and Escape (Q22). Every change updates the draft, as the panel's inputs do.
export function FieldInlineInput({
	value,
	name,
	placeholder,
	invalid,
	describedBy,
	readOnly,
	errorSlot,
	selectOnFocus,
	onSelected,
	className,
	onChange,
}: Readonly<Props>) {
	const snapshot = useRef(value);

	function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		// an Enter or Escape that ends an IME composition belongs to the IME
		if (event.nativeEvent.isComposing) return;
		if (event.key === "Enter") {
			event.preventDefault();
			return;
		}
		if (event.key === "Escape" && !readOnly) {
			event.preventDefault();
			onChange(snapshot.current);
		}
	}

	return (
		<textarea
			rows={1}
			value={value}
			aria-label={name}
			placeholder={placeholder}
			aria-invalid={invalid ? true : undefined}
			aria-describedby={describedBy}
			readOnly={readOnly}
			data-error-slot={errorSlot}
			autoComplete="off"
			onFocus={(event) => {
				snapshot.current = value;
				if (!selectOnFocus) return;
				event.currentTarget.select();
				onSelected?.();
			}}
			onChange={(event) =>
				onChange(event.target.value.replace(LINE_BREAKS, " "))
			}
			onKeyDown={onKeyDown}
			// only as wide as its text, so a click beside it reaches the card's
			// cover button; the content layer around it ignores the pointer. No
			// `outline-none` here: it would hide the focus ring.
			className={`pointer-events-auto field-sizing-content min-w-[2ch] max-w-full self-start resize-none rounded-sm wrap-break-word outline-none ${
				className ?? ""
			}`}
		/>
	);
}

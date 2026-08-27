import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Fragment, useId } from "react";
import { tv } from "tailwind-variants";
import type { FieldStatus } from "./input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/otp-primitive";

export const otpVariants = tv({
	slots: {
		root: "flex w-full flex-col items-center",
		row: "flex items-center gap-2",
		group: "flex items-center gap-2",
		slot: [
			"relative flex size-12 items-center justify-center rounded-md",
			"border-2 border-border-input bg-transparent text-center",
			"font-heading-sm text-text-bold",
			"transition-colors duration-100 ease-out",
			"data-[active=true]:border-border-focused",
		],
		separator: "h-0.5 w-3 shrink-0 rounded bg-background-accent-disabled",
		hint: [
			"min-h-5 pt-2 text-center",
			"font-body-sm font-medium text-text-secondary",
		],
	},
	variants: {
		status: {
			default: {},
			error: {
				slot: [
					"border-border-danger",
					"data-[active=true]:border-border-danger-subtle",
				],
				hint: "text-text-status-danger",
			},
			success: {
				slot: [
					"border-border-success",
					"data-[active=true]:border-border-success-subtle",
				],
				hint: "text-text-status-success",
			},
		},
		disabled: {
			true: {
				slot: "cursor-not-allowed text-text-disabled",
			},
		},
	},
	defaultVariants: {
		status: "default",
	},
});

interface OtpInputProps {
	value: string;
	onChange: (value: string) => void;
	onComplete?: (value: string) => void;
	length?: number;
	groupSize?: number;
	status?: FieldStatus;
	disabled?: boolean;
	help?: string;
	label: string;
	name?: string;
	required?: boolean;
}

const DIGITS_ONLY = /\D/g;

export function OtpInput({
	value,
	onChange,
	onComplete,
	length = 6,
	groupSize = 3,
	status = "default",
	disabled = false,
	help,
	label,
	name,
	required,
}: Readonly<OtpInputProps>) {
	const inputId = useId();
	const hintId = `${inputId}-hint`;

	const slotCount = Math.max(1, Math.floor(length));
	const slotsPerGroup = Math.max(1, Math.floor(groupSize));

	const digits = value.replace(DIGITS_ONLY, "").slice(0, slotCount);
	const groupCount = Math.ceil(slotCount / slotsPerGroup);

	const s = otpVariants({ status, disabled });

	return (
		<div className={s.root()}>
			<label htmlFor={inputId} className="sr-only">
				{label}
			</label>

			<InputOTP
				id={inputId}
				name={name}
				value={digits}
				onChange={onChange}
				onComplete={onComplete}
				maxLength={slotCount}
				pattern={REGEXP_ONLY_DIGITS}
				disabled={disabled}
				required={required}
				autoComplete="one-time-code"
				aria-invalid={status === "error" || undefined}
				aria-describedby={help ? hintId : undefined}
				containerClassName={s.row()}
			>
				{Array.from({ length: groupCount }, (_, groupIndex) => {
					const firstIndex = groupIndex * slotsPerGroup;
					const groupLength = Math.min(slotsPerGroup, slotCount - firstIndex);

					return (
						<Fragment key={`${inputId}-group-${groupIndex + 1}`}>
							{groupIndex > 0 && <span aria-hidden className={s.separator()} />}

							<InputOTPGroup className={s.group()}>
								{Array.from({ length: groupLength }, (_, offset) => {
									const index = firstIndex + offset;

									return (
										<InputOTPSlot
											key={`${inputId}-slot-${index}`}
											index={index}
											aria-invalid={status === "error" || undefined}
											className={s.slot()}
										/>
									);
								})}
							</InputOTPGroup>
						</Fragment>
					);
				})}
			</InputOTP>

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

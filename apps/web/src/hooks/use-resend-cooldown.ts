"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const RESENT_COOLDOWN_SECONDS = 60;

export function useResendCooldown(seconds: number = RESENT_COOLDOWN_SECONDS) {
	const [secondsLeft, setSecondsLeft] = useState(0);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const deadlineRef = useRef(0);

	const stop = useCallback(() => {
		if (intervalRef.current !== null) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}, []);

	const run = useCallback(
		(from: number) => {
			stop();

			if (from <= 0) {
				setSecondsLeft(0);
				return;
			}

			deadlineRef.current = Date.now() + from * 1000;
			setSecondsLeft(from);

			intervalRef.current = setInterval(() => {
				const left = Math.max(
					0,
					Math.ceil((deadlineRef.current - Date.now()) / 1000),
				);

				setSecondsLeft(left);
				if (left === 0) stop();
			}, 250);
		},
		[stop],
	);

	const start = useCallback(() => run(seconds), [run, seconds]);

	const startFrom = useCallback(
		(isoDate: string | null) => {
			if (!isoDate) {
				run(0);
				return;
			}

			const elapsed = Math.floor(
				(Date.now() - new Date(isoDate).getTime()) / 1000,
			);

			run(Math.max(0, seconds - elapsed));
		},
		[run, seconds],
	);

	useEffect(() => stop, [stop]);

	return { secondsLeft, isCoolingDown: secondsLeft > 0, start, startFrom };
}

import clsx from "clsx";
import { Loader2Icon, type LucideIcon } from "lucide-react";

// For Button's leadingIcon while a request runs. Decorative: the button's
// name stays the same and a status line says what is happening.
export const SpinnerIcon = (({ className, ...props }) => (
	<Loader2Icon
		{...props}
		aria-hidden="true"
		className={clsx(
			className,
			"size-4 animate-spin motion-reduce:animate-none",
		)}
	/>
)) as LucideIcon;

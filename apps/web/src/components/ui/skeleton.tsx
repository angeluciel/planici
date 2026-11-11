import clsx from "clsx";

// decorative placeholder; name the surrounding region with aria-label
export function Skeleton({
	className,
	...props
}: Readonly<React.ComponentPropsWithoutRef<"div">>) {
	return (
		<div
			aria-hidden="true"
			className={clsx(
				"animate-pulse rounded-md bg-background-skeleton motion-reduce:animate-none",
				className,
			)}
			{...props}
		/>
	);
}

import Image from "next/image";
import { Suspense } from "react";
import Header from "@/components/header";
import RegisterFlow from "./_components/RegisterFlow";

export default function RegisterPage() {
	return (
		<div className="min-h-screen flex flex-1 px-4 bg-surface relative">
			<div className="flex flex-col grow justify-between items-center">
				<Header />

				<Suspense>
					<RegisterFlow />
				</Suspense>

				<footer className="flex w-full pb-4 items-center-safe justify-center-safe">
					<span className="font-body-caption">
						2026 PLANICI, Todos os Direitos Reservados
					</span>
				</footer>
			</div>

			<div
				className="hidden md:block md:w-[33dvw] h-dvh relative -right-4"
				aria-hidden
			>
				<Image
					src="/right.jpg"
					alt="barista"
					fill
					className="object-cover"
					sizes="(max-width: 768px) 100vw, 50vw"
					priority
				/>
			</div>
		</div>
	);
}

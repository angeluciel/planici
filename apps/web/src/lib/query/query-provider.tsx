"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

// The app's one QueryClient factory (SPEC-0006 plan, G-8). It sets no
// defaults: each query states its own options (G-7), and the tests build
// their client here too, so they exercise exactly those options.
export function createQueryClient(): QueryClient {
	return new QueryClient();
}

// One client per browser session.
export function QueryProvider({ children }: Readonly<{ children: ReactNode }>) {
	const [client] = useState(createQueryClient);
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

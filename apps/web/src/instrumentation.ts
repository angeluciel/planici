// SPEC-0009 P-1: record each request's socket address before Next.js reads
// the request. Node.js runtime only; the edge runtime has no sockets.
export async function register(): Promise<void> {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const { startPeerCapture } = await import("./app/api/_lib/peer-address");
		startPeerCapture();
	}
}

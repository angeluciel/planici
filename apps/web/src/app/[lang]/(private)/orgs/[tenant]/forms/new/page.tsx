import type { FormType } from "@planici/schemas";
import { FormEditor } from "../_components/form-editor";

type Origin = "clients" | "services";

const ORIGIN_TYPES: Record<Origin, FormType> = {
	clients: "client",
	services: "service",
};

function one(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

// /forms/new?type=client|service&from=clients|services
// `from` locks the type and says where [Salvar] and [Cancelar] go (§4.3)
export default async function NewFormPage({
	searchParams,
}: Readonly<{
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
	const query = await searchParams;
	const from = one(query.from);
	const type = one(query.type);

	if (from === "clients" || from === "services") {
		return <FormEditor type={ORIGIN_TYPES[from]} from={from} />;
	}

	return (
		<FormEditor
			type={type === "client" || type === "service" ? type : undefined}
		/>
	);
}

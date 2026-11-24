import { FormEditor } from "../_components/form-editor";

export default async function FormPage({
	params,
}: Readonly<{ params: Promise<{ formId: string }> }>) {
	const { formId } = await params;

	return <FormEditor formId={formId} />;
}

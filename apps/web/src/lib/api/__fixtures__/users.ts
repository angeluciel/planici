export interface FixtureUser {
	id: string;
	email: string;
	password: string;
	locked?: boolean;
}

export const FIXTURE_USERS: FixtureUser[] = [
	{ id: "usr_1", email: "ana@planici.dev", password: "Hunter22%" },
	{
		id: "usr_2",
		email: "locked@planici.dev",
		password: "Hunter22%",
		locked: true,
	},
];

export const GOOGLE_FIXTURE_TOKEN = "dev-google-id-token";

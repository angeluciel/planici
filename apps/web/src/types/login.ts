export type LoginData = {
	email: string;
	password: string;
	rememberMe: boolean;
};

export const EMPTY_LOGIN_DATA: LoginData = {
	email: "",
	password: "",
	rememberMe: false,
};

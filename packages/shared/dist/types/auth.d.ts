export interface AuthTokens {
    accessToken: string;
    expiresIn: number;
}
export interface LoginResponse {
    user: import('./user').User;
    tokens: AuthTokens;
}
export interface SignupResponse {
    message: string;
    userId: string;
}
export interface PasswordResetRequest {
    email: string;
}
export interface PasswordResetConfirm {
    password: string;
    confirmPassword: string;
}
export interface VerifyEmailRequest {
    token: string;
}
//# sourceMappingURL=auth.d.ts.map
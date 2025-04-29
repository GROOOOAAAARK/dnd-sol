import { User as DbUser } from "./user";

export type User = Partial<DbUser>;

export interface AuthInput {
    signedMessage: string;
    signature: string;
    publicKey: string;
};

export interface AuthResponse {
    success: boolean;
    message: string;
    user?: User;
};
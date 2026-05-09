import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins";
import { prisma } from "./prisma";
import { env } from "../config/env";
import bcrypt from "bcrypt";

// Define roles for the application
const Role = {
    USER: "USER",
    ADMIN: "ADMIN",
    TRAVEL_AGENT: "TRAVEL_AGENT"
} as const;

const isProduction = env.NODE_ENV === "production";
const cleanURL = (url: string | undefined) => url?.trim().replace(/\/$/, "") || "";

// Session configuration
const sessionExpiresIn = 60 * 60 * 24; // 1 day
const sessionUpdateAge = 60 * 60 * 12; // 12 hours

export const auth = betterAuth({
    baseURL: cleanURL(isProduction ? env.CLIENT_URL?.split(',')[0] : "http://localhost:3000"),
    basePath: "/api/v1/auth",
    secret: env.BETTER_AUTH_SECRET,
    account: {
        accountLinking: {
            trustedProviders: ["google"],
        },
    },
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
        password: {
            hash: async (password) => {
                return await bcrypt.hash(password, 10);
            },
            verify: async ({ password, hash }) => {
                return await bcrypt.compare(password, hash);
            },
        },
        sendResetPassword: async ({ user, url, token }, request) => {
            console.log(`[AUTH] Password reset link for ${user.email}: ${url}`);
            // TODO: Implement email sending via BullMQ
        },
    },
    emailVerification: {
        sendOnSignUp: false,
        sendOnSignIn: false,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url, token }, request) => {
            console.log(`[AUTH] Email verification link for ${user.email}: ${url}`);
            // TODO: Implement email sending via BullMQ
        },
    },
    socialProviders: {
        google: {
            clientId: env.GOOGLE_CLIENT_ID || "",
            clientSecret: env.GOOGLE_CLIENT_SECRET || "",
            prompt: "select_account",
        },
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: true,
                defaultValue: Role.USER,
                input: false, // Prevent users from setting role directly during signup
            },
            avatar: {
                type: "string",
                required: false,
                defaultValue: "",
            },
            phone: {
                type: "string",
                required: false,
                defaultValue: "",
            },
        },
    },
    plugins: [
        bearer(),
    ],
    session: {
        strategy: "jwt",
        expiresIn: sessionExpiresIn,
        updateAge: sessionUpdateAge,
        cookieCache: {
            enabled: isProduction,
            maxAge: sessionExpiresIn,
        },
    },
    trustedOrigins: [
        "http://localhost:3000",
        "http://localhost:5000",
        ...(env.CLIENT_URL?.split(',').map(url => cleanURL(url)) || []),
        cleanURL(env.BETTER_AUTH_URL),
    ].filter(Boolean),
    advanced: {
        defaultCookieAttributes: {
            sameSite: isProduction ? "none" : "lax",
            secure: isProduction,
            httpOnly: true,
            path: "/",
        },
        useSecureCookies: isProduction,
        crossSubDomainCookies: {
            enabled: false,
        },
    },
});

// Export Role for use in other modules
export { Role };

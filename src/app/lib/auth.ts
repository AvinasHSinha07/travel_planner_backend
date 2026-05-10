import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins";
import { prisma } from "./prisma";
import { env } from "../config/env";

// Define roles for the application
const Role = {
    USER: "USER",
    ADMIN: "ADMIN",
    TRAVEL_AGENT: "TRAVEL_AGENT"
} as const;

const isProduction = env.NODE_ENV === "production";
const cleanURL = (url: string | undefined) => url?.trim().replace(/\/$/, "") || "";

// Session configuration from env (matching planora)
const sessionExpiresIn = Number.isFinite(parseInt(process.env.BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN || ''))
    ? parseInt(process.env.BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN as string)
    : 60 * 60 * 24; // 1 day default

const sessionUpdateAge = Number.isFinite(parseInt(process.env.BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE || ''))
    ? parseInt(process.env.BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE as string)
    : 60 * 60 * 12; // 12 hours default

export const auth = betterAuth({
    // Public origin browsers use to reach /api/v1/auth (Next rewrites or direct API). Prefer CLIENT_URL.
    baseURL: cleanURL(env.CLIENT_URL?.split(',')[0] || env.BETTER_AUTH_URL),
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
                // Allowed values are enforced in app.ts for sign-up (USER / TRAVEL_AGENT only; ADMIN blocked).
                input: true,
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
            enabled: true,
            maxAge: sessionExpiresIn,
        },
    },
    trustedOrigins: [
        "http://localhost:3000",
        "http://localhost:5000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5000",
        ...(env.CLIENT_URL?.split(',').map(url => cleanURL(url)) || []),
        cleanURL(env.BETTER_AUTH_URL),
    ].filter(Boolean),
    advanced: {
        defaultCookieAttributes: {
            // Same-origin app (Next :3000 → /api/v1 → backend): "lax" works and avoids browsers rejecting SameSite=None without Secure.
            // Production cross-subdomain setups can switch to "none" + secure cookies if needed.
            sameSite: isProduction ? "none" : "lax",
            secure: isProduction,
            httpOnly: true,
            path: "/",
        },
        useSecureCookies: isProduction,
        crossSubDomainCookies: {
            enabled: false,
        },
        disableCSRFCheck: !isProduction,
    },
});

// Export Role for use in other modules
export { Role };

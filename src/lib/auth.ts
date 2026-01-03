import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
// Types extended in @/types/index.ts

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 heures - expiration de session pour sécurité
    updateAge: 60 * 60, // Rafraîchir le token toutes les heures si actif
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        loginType: { label: "Login Type", type: "text" }, // "admin" or "client"
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const loginType = (credentials.loginType as string) || "admin"
        const isClientLogin = loginType === "client"

        // Find user with matching role type
        const user = await prisma.user.findFirst({
          where: {
            email: credentials.email as string,
            role: isClientLogin ? "client" : { not: "client" },
          },
        })

        if (!user || !user.isActive) {
          return null
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!passwordMatch) {
          return null
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          type: user.role,
          clientId: user.clientId ? String(user.clientId) : undefined,
          isPrimaryUser: user.isPrimaryUser,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.type = (user as any).type
        token.clientId = (user as any).clientId
        token.isPrimaryUser = (user as any).isPrimaryUser
      }

      // Handle impersonation start
      if (trigger === "update" && session?.impersonate) {
        // Store original user info
        token.originalUserId = token.id as string
        token.originalUserType = token.type as string
        token.isImpersonating = true
        // Switch to impersonated user
        token.id = session.impersonate.userId
        token.type = "client"
        token.clientId = session.impersonate.clientId
        token.isPrimaryUser = session.impersonate.isPrimaryUser
        token.impersonatedName = session.impersonate.userName
        token.impersonatedClientName = session.impersonate.clientName
      }

      // Handle impersonation end
      if (trigger === "update" && session?.endImpersonation) {
        token.id = token.originalUserId
        token.type = token.originalUserType
        token.isImpersonating = false
        delete token.originalUserId
        delete token.originalUserType
        delete token.clientId
        delete token.isPrimaryUser
        delete token.impersonatedName
        delete token.impersonatedClientName
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.type = token.type as string
        session.user.clientId = token.clientId as string | undefined
        session.user.isPrimaryUser = token.isPrimaryUser as boolean | undefined
        session.user.isImpersonating = (token.isImpersonating as boolean) || false
        if (token.isImpersonating) {
          session.user.originalUserId = token.originalUserId as string
          session.user.originalUserType = token.originalUserType as string
          ;(session.user as any).impersonatedName = token.impersonatedName
          ;(session.user as any).impersonatedClientName = token.impersonatedClientName
        }
      }
      return session
    },
  },
})

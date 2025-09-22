// src/lib/auth.ts
// This file configures NextAuth.js for our authentication system

import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

// NextAuth configuration object - this tells NextAuth how to handle authentication
export const authOptions = {
  // Explicitly set secret and enable debug in development to surface errors
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV !== "production",
  // Session configuration
  session: {
    // Use JWT tokens instead of database sessions (simpler for our app)
    strategy: "jwt" as const,
  },
  
  // Custom pages for authentication (instead of NextAuth's default pages)
  pages: {
    signIn: "/auth/signin",    // Our custom sign-in page
  },
  
  // Authentication providers - different ways users can sign in
  providers: [
    // Credentials provider allows users to sign in with email/password
    CredentialsProvider({
      name: "credentials",
      
      // Define what credentials we expect from the user
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      
      // This function runs when someone tries to sign in
      async authorize(credentials) {
        // First, check if we have both email and password
        if (!credentials?.email || !credentials?.password) {
          return null // Return null if missing credentials (sign in fails)
        }

        // Look for the user in our database using their email
        const user = await db.user.findUnique({
          where: { email: credentials.email }
        })

        // If no user found with this email, sign in fails
        if (!user) {
          return null
        }

        // Check if the provided password matches the stored hashed password
        // bcrypt.compare() safely compares plain text password with hashed password
        const isValidPassword = await bcrypt.compare(
          credentials.password,  // Plain text password from user
          user.password         // Hashed password from database
        )

        // If password doesn't match, sign in fails
        if (!isValidPassword) {
          return null
        }

        // If we get here, authentication was successful!
        // Return user object (excluding sensitive data like password)
        return {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
        }
      }
    })
  ],
  
  // Callbacks allow us to customize what happens during authentication
  callbacks: {
    // JWT callback: runs whenever a JWT token is created/updated
    async jwt({ token, user }: { token: any; user: any }) {
      // If we have a user object (during sign in), add user ID to token
      if (user) {
        token.id = user.id
      }
      return token
    },
    
    // Session callback: runs whenever a session is accessed
    async session({ session, token }: { session: any; token: any }) {
      // Add user ID from token to session object
      // This makes user.id available in our React components
      if (token && session.user) {
        (session.user as { id?: string }).id = token.id as string
      }
      return session
    },
  },
}
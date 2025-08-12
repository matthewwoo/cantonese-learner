// src/app/api/auth/register/route.ts
// This API endpoint handles user registration (creating new accounts)

import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { z } from "zod"

// Input validation schema using Zod library
// This defines the rules for what data we accept during registration
const registerSchema = z.object({
  email: z.string().email("Invalid email address"), // Must be valid email format
  password: z.string().min(6, "Password must be at least 6 characters"), // Min 6 chars
  name: z.string().min(1, "Name is required").optional(), // Optional name field
})

// This function handles POST requests to /api/auth/register
export async function POST(request: NextRequest) {
  try {
    // Parse the JSON data from the request body
    const body = await request.json()
    
    // Validate the input data against our schema
    // If validation fails, this will throw an error
    const { email, password, name } = registerSchema.parse(body)

    // Check if a user with this email already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    // If user exists, return an error response
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 } // HTTP 400 = Bad Request
      )
    }

    // Hash the password before storing it in the database
    // The number 12 is the "salt rounds" - higher = more secure but slower
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create the new user in our database
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword, // Store hashed password, never plain text!
        name: name || null,       // Use provided name or null if not provided
      }
    })

    // Return success response with user data (excluding password for security)
    return NextResponse.json({
      message: "User created successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    })

  } catch (error) {
    // Handle validation errors from Zod
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }

    // Log unexpected errors for debugging
    console.error("Registration error:", error)
    
    // Return generic error message (don't expose internal errors to users)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 } // HTTP 500 = Internal Server Error
    )
  }
}
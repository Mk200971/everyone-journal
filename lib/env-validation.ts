const requiredEnvVars = {
  // Supabase configuration
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

  // Optional but recommended
  NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
} as const

export function validateEnvironmentVariables() {
  const missing: string[] = []
  const warnings: string[] = []

  // Check required variables
  const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]

  for (const key of required) {
    if (!requiredEnvVars[key as keyof typeof requiredEnvVars]) {
      missing.push(key)
    }
  }

  // Check optional but recommended variables
  const recommended = ["GROQ_API_KEY", "NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL"]

  for (const key of recommended) {
    if (!requiredEnvVars[key as keyof typeof requiredEnvVars]) {
      warnings.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Please check your .env.local file and ensure all required variables are set.",
    )
  }

  if (warnings.length > 0 && process.env.NODE_ENV === "development") {
    console.warn(
      `⚠️  Missing optional environment variables: ${warnings.join(", ")}\n` +
        "Some features may not work correctly without these variables.",
    )
  }

  return {
    supabase: {
      url: requiredEnvVars.NEXT_PUBLIC_SUPABASE_URL!,
      anonKey: requiredEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      serviceRoleKey: requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY!,
    },
    redirectUrl: requiredEnvVars.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL,
    groqApiKey: requiredEnvVars.GROQ_API_KEY,
  }
}

// Validate on module load in production
if (process.env.NODE_ENV === "production") {
  validateEnvironmentVariables()
}

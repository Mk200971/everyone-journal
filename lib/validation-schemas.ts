/**
 * Zod Validation Schemas
 * Centralized validation for all server actions and API routes
 */

import { z } from "zod"

// ============================================================================
// Mission Schemas
// ============================================================================

export const createMissionSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().min(1, "Description is required").max(2000, "Description must be less than 2000 characters"),
  instructions: z.string().max(5000, "Instructions must be less than 5000 characters").optional().nullable(),
  tips_inspiration: z.string().max(2000, "Tips must be less than 2000 characters").optional().nullable(),
  points_value: z.number().int().min(1, "Points must be at least 1").max(1000, "Points must be less than 1000"),
  type: z.enum(["Action", "Core", "Lite", "Elevate"], {
    errorMap: () => ({ message: "Invalid mission type" }),
  }),
  resource_id: z.string().uuid().optional().nullable(),
  quote_id: z.string().uuid().optional().nullable(),
  duration: z.string().max(100).optional().nullable(),
  coordinator: z.string().max(200).optional().nullable(),
  support_status: z.string().max(100).optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  mission_number: z.number().int().min(1).max(999).optional().nullable(),
  display_order: z.number().int().min(0).optional().nullable(),
  max_submissions_per_user: z.number().int().min(1).max(100).optional().nullable(),
  submission_schema: z.record(z.unknown()).optional().nullable(),
})

export const updateMissionSchema = createMissionSchema.extend({
  id: z.string().uuid("Invalid mission ID"),
})

export const deleteMissionSchema = z.object({
  id: z.string().uuid("Invalid mission ID"),
})

// ============================================================================
// Submission Schemas
// ============================================================================

export const submitMissionSchema = z.object({
  missionId: z.string().uuid("Invalid mission ID"),
  textSubmission: z.string().min(1, "Submission text is required").max(10000, "Submission is too long").optional(),
  answers: z.record(z.unknown()).optional(),
  mediaFile: z.instanceof(File).optional(),
})

export const saveDraftSchema = z.object({
  missionId: z.string().uuid("Invalid mission ID"),
  textSubmission: z.string().max(10000, "Submission is too long").optional().nullable(),
  answers: z.record(z.unknown()).optional().nullable(),
  mediaFile: z.instanceof(File).optional().nullable(),
  existingDraftId: z.string().uuid().optional().nullable(),
})

export const updateSubmissionSchema = z.object({
  submissionId: z.string().uuid("Invalid submission ID"),
  textSubmission: z.string().max(10000, "Submission is too long").optional().nullable(),
  answers: z.record(z.unknown()).optional().nullable(),
  mediaFile: z.instanceof(File).optional().nullable(),
  removedMediaUrls: z.array(z.string().url()).optional(),
})

export const deleteDraftSchema = z.object({
  draftId: z.string().uuid("Invalid draft ID"),
})

// ============================================================================
// Profile Schemas
// ============================================================================

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be less than 200 characters"),
  job_title: z.string().max(200, "Job title must be less than 200 characters").optional().nullable(),
  department: z.string().max(200, "Department must be less than 200 characters").optional().nullable(),
  bio: z.string().max(1000, "Bio must be less than 1000 characters").optional().nullable(),
  country: z.string().max(100, "Country must be less than 100 characters").optional().nullable(),
  customer_obsession: z
    .string()
    .max(1000, "Customer obsession must be less than 1000 characters")
    .optional()
    .nullable(),
})

export const updateAvatarSchema = z.object({
  avatar: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, "File size must be less than 5MB")
    .refine((file) => file.type.startsWith("image/"), "File must be an image"),
})

// ============================================================================
// Auth Schemas
// ============================================================================

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100, "Password is too long"),
  name: z.string().min(1, "Name is required").max(200, "Name must be less than 200 characters"),
  job_title: z.string().min(1, "Job title is required").max(200, "Job title must be less than 200 characters"),
  department: z.string().min(1, "Department is required").max(200, "Department must be less than 200 characters"),
  bio: z.string().min(1, "Bio is required").max(1000, "Bio must be less than 1000 characters"),
  country: z.string().min(1, "Country is required").max(100, "Country must be less than 100 characters"),
})

// ============================================================================
// Admin Schemas
// ============================================================================

export const updateMissionOrderSchema = z.array(
  z.object({
    id: z.string().uuid("Invalid mission ID"),
    display_order: z.number().int().min(0, "Display order must be non-negative"),
  }),
)

// ============================================================================
// Pagination Schema
// ============================================================================

export const paginationSchema = z.object({
  page: z.number().int().min(1, "Page must be at least 1").default(1),
  limit: z.number().int().min(1, "Limit must be at least 1").max(100, "Limit must be at most 100").default(10),
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates FormData against a Zod schema
 * Converts FormData to object and validates
 */
export function validateFormData<T>(formData: FormData, schema: z.ZodSchema<T>): z.SafeParseReturnType<T, T> {
  const data: Record<string, unknown> = {}

  formData.forEach((value, key) => {
    // Handle file uploads
    if (value instanceof File) {
      data[key] = value
    }
    // Handle JSON strings
    else if (typeof value === "string" && (key.includes("schema") || key.includes("answers"))) {
      try {
        data[key] = JSON.parse(value)
      } catch {
        data[key] = value
      }
    } else if (
      typeof value === "string" &&
      !Number.isNaN(Number(value)) &&
      (key.includes("_value") || key.includes("_order") || key.includes("_number") || key.includes("max_submissions"))
    ) {
      data[key] = Number(value)
    }
    // Handle regular strings
    else {
      data[key] = value
    }
  })

  return schema.safeParse(data)
}

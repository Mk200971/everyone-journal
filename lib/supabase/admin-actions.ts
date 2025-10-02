import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function createMission(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const type = formData.get("type") as string
  const resourceId = formData.get("resource_id") as string
  const pointsValue = Number.parseInt(formData.get("points_value") as string)
  const missionImage = formData.get("mission_image") as File

  let imageUrl = null

  if (missionImage && missionImage.size > 0) {
    const fileExt = missionImage.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("missions-media")
      .upload(fileName, missionImage)

    if (uploadError) {
      console.error("Error uploading image:", uploadError)
    } else {
      const {
        data: { publicUrl },
      } = supabase.storage.from("missions-media").getPublicUrl(fileName)
      imageUrl = publicUrl
    }
  }

  const { error } = await supabase.from("missions").insert({
    title,
    description,
    type,
    resource_id: resourceId === "none" ? null : resourceId,
    points_value: pointsValue,
    image_url: imageUrl,
  })

  if (error) {
    console.error("Error creating mission:", error)
    throw new Error("Failed to create mission")
  }

  revalidatePath("/admin")
  redirect("/admin")
}

export async function updateMission(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })

  const id = formData.get("id") as string
  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const type = formData.get("type") as string
  const resourceId = formData.get("resource_id") as string
  const pointsValue = Number.parseInt(formData.get("points_value") as string)
  const missionImage = formData.get("mission_image") as File

  const updateData: any = {
    title,
    description,
    type,
    resource_id: resourceId === "none" ? null : resourceId,
    points_value: pointsValue,
  }

  if (missionImage && missionImage.size > 0) {
    const fileExt = missionImage.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("missions-media")
      .upload(fileName, missionImage)

    if (uploadError) {
      console.error("Error uploading image:", uploadError)
    } else {
      const {
        data: { publicUrl },
      } = supabase.storage.from("missions-media").getPublicUrl(fileName)
      updateData.image_url = publicUrl
    }
  }

  const { error } = await supabase.from("missions").update(updateData).eq("id", id)

  if (error) {
    console.error("Error updating mission:", error)
    throw new Error("Failed to update mission")
  }

  revalidatePath("/admin")
  redirect("/admin")
}

export async function deleteMission(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })

  const id = formData.get("id") as string

  const { error } = await supabase.from("missions").delete().eq("id", id)

  if (error) {
    console.error("Error deleting mission:", error)
    throw new Error("Failed to delete mission")
  }

  revalidatePath("/admin")
  redirect("/admin")
}

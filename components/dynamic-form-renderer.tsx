"use client"

import type React from "react"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Trash2, Upload, Loader2, Save, X } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import type { JsonValue } from "type-fest"

interface FormField {
  type: "textarea" | "input" | "select" | "url" | "group"
  name: string
  label: string
  required?: boolean
  minRows?: number
  maxLength?: number
  helperText?: string
  options?: { label: string; value: string }[]
  fields?: FormField[]
  repeat?: { min: number; max: number }
}

interface FormSchema {
  version: number
  fields: FormField[]
}

interface DynamicFormRendererProps {
  schema: FormSchema | null
  onSubmit: (answers: Record<string, JsonValue>, mediaFiles: File[], removedMediaUrls?: string[]) => void
  onSaveProgress?: (answers: Record<string, JsonValue>, mediaFiles: File[], removedMediaUrls?: string[]) => void
  className?: string
  preview?: boolean
  initialAnswers?: Record<string, JsonValue>
  initialMediaUrls?: string[]
  submitButtonText?: string
  isSubmitting?: boolean
  onSubmittingChange?: (isSubmitting: boolean) => void
  showSuccessDialogOnSubmit?: boolean
}

export function DynamicFormRenderer({
  schema,
  onSubmit,
  onSaveProgress,
  className = "",
  preview = false,
  initialAnswers,
  initialMediaUrls = [],
  submitButtonText = "Submit Activity",
  isSubmitting: externalIsSubmitting,
  onSubmittingChange,
  showSuccessDialogOnSubmit = false,
}: DynamicFormRendererProps) {
  const router = useRouter()

  const initializedRef = useRef(false)
  const schemaRef = useRef(schema)

  const memoizedSchema = useMemo(() => schema, [schema])

  const [formData, setFormData] = useState<Record<string, JsonValue>>(() => initialAnswers || {})
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>(() => initialMediaUrls)
  const [removedMediaUrls, setRemovedMediaUrls] = useState<string[]>([])
  const [groupInstances, setGroupInstances] = useState<Record<string, number>>({})
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false)
  const [isSavingProgress, setIsSavingProgress] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  const isSubmittingState = externalIsSubmitting !== undefined ? externalIsSubmitting : internalIsSubmitting

  useEffect(() => {
    if (!memoizedSchema || initializedRef.current) return

    const newGroupInstances: Record<string, number> = {}
    const newFormData = { ...formData }

    memoizedSchema.fields.forEach((field) => {
      if (field.type === "group" && field.repeat && field.fields) {
        const existingData = formData[field.name]

        if (existingData && Array.isArray(existingData) && existingData.length > 0) {
          newGroupInstances[field.name] = existingData.length
        } else {
          newGroupInstances[field.name] = field.repeat.min

          const initialData = Array.from({ length: field.repeat.min }, () => {
            const groupData: Record<string, JsonValue> = {}
            field.fields?.forEach((subField) => {
              groupData[subField.name] = ""
            })
            return groupData
          })

          newFormData[field.name] = initialData
        }
      }
    })

    setGroupInstances(newGroupInstances)
    setFormData(newFormData)
    initializedRef.current = true
  }, [memoizedSchema])

  useEffect(() => {
    if (initialAnswers && Object.keys(initialAnswers).length > 0 && initializedRef.current) {
      setFormData(initialAnswers)
    }
  }, [JSON.stringify(initialAnswers)])

  useEffect(() => {
    if (initialMediaUrls && initialMediaUrls.length > 0 && initializedRef.current) {
      setExistingMediaUrls(initialMediaUrls)
    }
  }, [JSON.stringify(initialMediaUrls)])

  const removeExistingMedia = useCallback((url: string) => {
    setExistingMediaUrls((prev) => prev.filter((u) => u !== url))
    setRemovedMediaUrls((prev) => [...prev, url])
  }, [])

  const updateFormData = useCallback((path: string, value: JsonValue) => {
    setFormData((prev) => {
      const newData = { ...prev }
      const keys = path.split(".")
      let current: Record<string, JsonValue> = newData

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i]
        if (!current[key]) {
          current[key] = {}
        }
        current = current[key] as Record<string, JsonValue>
      }

      current[keys[keys.length - 1]] = value
      return newData
    })
  }, [])

  const getFormValue = useCallback(
    (path: string): string => {
      const keys = path.split(".")
      let current: JsonValue = formData

      for (const key of keys) {
        if (current && typeof current === "object" && !Array.isArray(current) && key in current) {
          current = (current as Record<string, JsonValue>)[key]
        } else {
          return ""
        }
      }

      return String(current || "")
    },
    [formData],
  )

  const addGroupInstance = useCallback(
    (fieldName: string) => {
      const field = memoizedSchema?.fields.find((f) => f.name === fieldName)
      if (!field || !field.repeat) return

      const currentCount = groupInstances[fieldName] || field.repeat.min
      if (currentCount < field.repeat.max) {
        setGroupInstances((prev) => ({
          ...prev,
          [fieldName]: currentCount + 1,
        }))

        const newGroupData: Record<string, JsonValue> = {}
        field.fields?.forEach((subField) => {
          newGroupData[subField.name] = ""
        })

        setFormData((prev) => ({
          ...prev,
          [fieldName]: [...((prev[fieldName] as JsonValue[]) || []), newGroupData],
        }))
      }
    },
    [memoizedSchema, groupInstances],
  )

  const removeGroupInstance = useCallback(
    (fieldName: string, index: number) => {
      const field = memoizedSchema?.fields.find((f) => f.name === fieldName)
      if (!field || !field.repeat) return

      const currentCount = groupInstances[fieldName] || field.repeat.min
      if (currentCount > field.repeat.min) {
        setGroupInstances((prev) => ({
          ...prev,
          [fieldName]: currentCount - 1,
        }))

        setFormData((prev) => ({
          ...prev,
          [fieldName]: ((prev[fieldName] as JsonValue[]) || []).filter((_, i) => i !== index),
        }))
      }
    },
    [memoizedSchema, groupInstances],
  )

  const renderField = useCallback(
    (field: FormField, basePath = "") => {
      const fieldPath = basePath ? `${basePath}.${field.name}` : field.name
      const fieldId = fieldPath.replace(/\./g, "_")

      switch (field.type) {
        case "textarea":
          return (
            <div key={fieldPath} className="space-y-2">
              <Label htmlFor={fieldId} className="text-sm sm:text-base text-foreground font-medium">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </Label>
              {field.helperText && <p className="text-sm text-muted-foreground">{field.helperText}</p>}
              <Textarea
                id={fieldId}
                value={getFormValue(fieldPath)}
                onChange={(e) => updateFormData(fieldPath, e.target.value)}
                className="min-h-32 sm:min-h-28 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground resize-none text-base touch-manipulation"
                required={field.required}
                maxLength={field.maxLength}
                rows={field.minRows || 3}
              />
              {field.maxLength && (
                <p className="text-xs text-muted-foreground text-right">
                  {getFormValue(fieldPath).length}/{field.maxLength}
                </p>
              )}
            </div>
          )

        case "input":
        case "url":
          return (
            <div key={fieldPath} className="space-y-2">
              <Label htmlFor={fieldId} className="text-sm sm:text-base text-foreground font-medium">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </Label>
              {field.helperText && <p className="text-sm text-muted-foreground">{field.helperText}</p>}
              <Input
                id={fieldId}
                type={field.type === "url" ? "url" : "text"}
                value={getFormValue(fieldPath)}
                onChange={(e) => updateFormData(fieldPath, e.target.value)}
                className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground h-12 sm:h-10 text-base touch-manipulation"
                required={field.required}
                maxLength={field.maxLength}
              />
            </div>
          )

        case "select":
          return (
            <div key={fieldPath} className="space-y-2">
              <Label htmlFor={fieldId} className="text-sm sm:text-base text-foreground font-medium">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </Label>
              {field.helperText && <p className="text-sm text-muted-foreground">{field.helperText}</p>}
              <Select
                value={getFormValue(fieldPath)}
                onValueChange={(value) => updateFormData(fieldPath, value)}
                required={field.required}
              >
                <SelectTrigger className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )

        case "group":
          if (!field.repeat || !field.fields) return null

          const instanceCount = groupInstances[field.name] || field.repeat.min
          const instances = Array.from({ length: instanceCount }, (_, i) => i)

          return (
            <div key={fieldPath} className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-sm sm:text-base text-foreground font-medium text-lg">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </Label>
                {instanceCount < field.repeat.max && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addGroupInstance(field.name)}
                    className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add {field.label}
                  </Button>
                )}
              </div>

              {instances.map((index) => (
                <div
                  key={`${field.name}_${index}`}
                  className="bg-white/5 dark:bg-black/10 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-lg p-4 space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-sm sm:text-base text-foreground">
                      {field.label} #{index + 1}
                    </h4>
                    {instanceCount > field.repeat.min && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGroupInstance(field.name, index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {field.fields.map((subField) => renderField(subField, `${field.name}.${index}`))}
                </div>
              ))}
            </div>
          )

        default:
          return null
      }
    },
    [getFormValue, updateFormData, groupInstances, addGroupInstance, removeGroupInstance],
  )

  const handleSaveProgress = useCallback(async () => {
    if (!onSaveProgress || isSavingProgress) return

    console.log("[v0] DynamicFormRenderer - handleSaveProgress called")
    console.log("[v0] formData:", formData)
    console.log("[v0] mediaFiles:", mediaFiles)
    console.log("[v0] removedMediaUrls:", removedMediaUrls)

    setIsSavingProgress(true)
    try {
      await onSaveProgress(formData, mediaFiles, removedMediaUrls)
      console.log("[v0] onSaveProgress completed successfully")
    } catch (error) {
      console.error("[v0] Error in handleSaveProgress:", error)
    } finally {
      setIsSavingProgress(false)
      console.log("[v0] handleSaveProgress - reset isSavingProgress to false")
    }
  }, [onSaveProgress, isSavingProgress, formData, mediaFiles, removedMediaUrls])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (isSubmittingState) {
        console.log("[v0] Already submitting, ignoring duplicate submission")
        return
      }

      console.log("[v0] DynamicFormRenderer - handleSubmit called")
      console.log("[v0] formData:", formData)
      console.log("[v0] mediaFiles:", mediaFiles)
      console.log("[v0] removedMediaUrls:", removedMediaUrls)

      const validateField = (field: FormField, basePath = ""): boolean => {
        const fieldPath = basePath ? `${basePath}.${field.name}` : field.name

        if (field.type === "group" && field.fields && field.repeat) {
          const groupData = (formData[field.name] as JsonValue[]) || []
          if (field.required && groupData.length === 0) return false

          return groupData.every((_, index) =>
            field.fields!.every((subField) => validateField(subField, `${field.name}.${index}`)),
          )
        }

        if (field.required) {
          const value = getFormValue(fieldPath)
          return value && value.toString().trim() !== ""
        }

        return true
      }

      const isValid = memoizedSchema?.fields.every((field) => validateField(field)) || true

      if (!isValid) {
        console.log("[v0] Form validation failed")
        return
      }

      if (onSubmittingChange) {
        onSubmittingChange(true)
      } else {
        setInternalIsSubmitting(true)
      }

      try {
        console.log("[v0] Calling onSubmit...")
        await onSubmit(formData, mediaFiles, removedMediaUrls)
        console.log("[v0] onSubmit completed successfully")
        if (showSuccessDialogOnSubmit) {
          setShowSuccessDialog(true)
        }
      } catch (error) {
        console.error("[v0] Error in handleSubmit:", error)
      } finally {
        if (onSubmittingChange) {
          onSubmittingChange(false)
        } else {
          setInternalIsSubmitting(false)
        }
        console.log("[v0] handleSubmit - reset submitting state to false")
      }
    },
    [
      isSubmittingState,
      formData,
      mediaFiles,
      removedMediaUrls,
      memoizedSchema,
      getFormValue,
      onSubmit,
      onSubmittingChange,
      showSuccessDialogOnSubmit,
    ],
  )

  const formFields = useMemo(
    () => (
      <>
        {memoizedSchema?.fields.map((field) => renderField(field)) || (
          <div className="space-y-2">
            <Label htmlFor="journal_entry" className="text-sm sm:text-base text-foreground font-medium">
              Your Journal Entry
              <span className="text-red-400 ml-1">*</span>
            </Label>
            <p className="text-sm text-muted-foreground">Share your experience, thoughts, and reflections...</p>
            <Textarea
              id="journal_entry"
              value={getFormValue("journal_entry")}
              onChange={(e) => updateFormData("journal_entry", e.target.value)}
              className="min-h-32 sm:min-h-28 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground resize-none text-base touch-manipulation"
              required
              minRows={4}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm sm:text-base text-foreground font-medium flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Upload Media (Optional)
          </Label>

          {existingMediaUrls.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-sm text-muted-foreground">Current media:</p>
              <div className="flex flex-wrap gap-2">
                {existingMediaUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <Image
                      src={url || "/placeholder.svg"}
                      alt={`Existing media ${index + 1}`}
                      width={120}
                      height={120}
                      className="rounded-lg object-cover border border-white/20 dark:border-white/10"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeExistingMedia(url)}
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={preview}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white/5 dark:bg-black/10 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-lg p-4">
            <Input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => setMediaFiles(Array.from(e.target.files || []))}
              className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3"
              disabled={preview}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {existingMediaUrls.length > 0
                ? "Upload new media to replace existing files"
                : "Supported formats: Images (JPG, PNG, GIF) and Videos (MP4, MOV)"}
            </p>
            {mediaFiles.length > 0 && (
              <p className="text-xs text-primary mt-1">{mediaFiles.length} new file(s) selected</p>
            )}
          </div>
        </div>

        {!preview && (
          <div className="flex flex-col sm:flex-row gap-3">
            {onSaveProgress && (
              <Button
                type="button"
                onClick={handleSaveProgress}
                disabled={isSavingProgress || isSubmittingState}
                variant="outline"
                className="flex-1 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-black/30 text-foreground font-semibold py-4 text-lg hover:scale-105 transition-all duration-300 min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                size="lg"
              >
                {isSavingProgress ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Save Progress
                  </>
                )}
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmittingState || isSavingProgress}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 text-lg hover:scale-105 transition-all duration-300 min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              size="lg"
            >
              {isSubmittingState ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {submitButtonText.includes("Save") ? "Saving..." : "Submitting..."}
                </>
              ) : (
                submitButtonText
              )}
            </Button>
          </div>
        )}
      </>
    ),
    [
      memoizedSchema,
      renderField,
      getFormValue,
      updateFormData,
      existingMediaUrls,
      removeExistingMedia,
      preview,
      mediaFiles,
      onSaveProgress,
      handleSaveProgress,
      isSavingProgress,
      isSubmittingState,
      submitButtonText,
    ],
  )

  const handleSuccessDialogClose = useCallback(() => {
    setShowSuccessDialog(false)
    router.refresh()
    window.location.reload()
  }, [router])

  if (preview) {
    return <div className={`space-y-6 pointer-events-none opacity-75 ${className}`}>{formFields}</div>
  }

  return (
    <>
      <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
        {formFields}
      </form>

      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="bg-white/95 dark:bg-black/95 backdrop-blur-lg border border-white/20 dark:border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl text-foreground">Changes Saved!</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Your changes have been saved successfully. Click OK to see your updates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={handleSuccessDialogClose}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

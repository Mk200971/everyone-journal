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
import { Plus, Trash2, Upload, Loader2, Save, X } from 'lucide-react'
import Image from "next/image"
import { useRouter } from 'next/navigation'
import type { JsonValue } from "type-fest"
import imageCompression from 'browser-image-compression'

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [filePreview, setFilePreview] = useState<Array<{file: File, preview: string | null}>>([])
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadingFileName, setUploadingFileName] = useState<string>("")
  const [isCompressing, setIsCompressing] = useState(false)

  const memoizedSchema = useMemo(() => schema, [schema])

  const [formData, setFormData] = useState<Record<string, JsonValue>>(() => initialAnswers || {})
  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>(() => {
    if (!initialMediaUrls || initialMediaUrls.length === 0) return []
    
    // Handle case where initialMediaUrls might be a JSON string
    if (typeof initialMediaUrls === 'string') {
      try {
        const parsed = JSON.parse(initialMediaUrls)
        return Array.isArray(parsed) ? parsed : [initialMediaUrls]
      } catch {
        return [initialMediaUrls]
      }
    }
    
    return Array.isArray(initialMediaUrls) ? initialMediaUrls : []
  })
  const [removedMediaUrls, setRemovedMediaUrls] = useState<string[]>([])
  const [groupInstances, setGroupInstances] = useState<Record<string, number>>({})
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false)
  const [isSavingProgress, setIsSavingProgress] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [fileUploadError, setFileUploadError] = useState<string>("")

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
      const parsedUrls = typeof initialMediaUrls === 'string' 
        ? (() => {
            try {
              const parsed = JSON.parse(initialMediaUrls)
              return Array.isArray(parsed) ? parsed : [initialMediaUrls]
            } catch {
              return [initialMediaUrls]
            }
          })()
        : Array.isArray(initialMediaUrls) 
          ? initialMediaUrls 
          : []
      
      setExistingMediaUrls(parsedUrls)
    }
  }, [JSON.stringify(initialMediaUrls)])

  const removeExistingMedia = useCallback((url: string) => {
    console.log("[v0] removeExistingMedia called for URL:", url)
    console.log("[v0] Current existingMediaUrls:", existingMediaUrls)
    console.log("[v0] Current removedMediaUrls:", removedMediaUrls)
    
    setExistingMediaUrls((prev) => {
      const newUrls = prev.filter((u) => u !== url)
      console.log("[v0] New existingMediaUrls after removal:", newUrls)
      return newUrls
    })
    
    setRemovedMediaUrls((prev) => {
      const newRemoved = [...prev, url]
      console.log("[v0] New removedMediaUrls after addition:", newRemoved)
      return newRemoved
    })
  }, [existingMediaUrls, removedMediaUrls])

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
      if (!field || !field.repeat || !field.fields) return

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
      if (!field || !field.repeat || !field.fields) return

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
    
    const files = fileInputRef.current?.files ? Array.from(fileInputRef.current.files) : []
    console.log("[v0] mediaFiles from ref:", files.map(f => ({ name: f.name, size: f.size, type: f.type })))
    console.log("[v0] removedMediaUrls:", removedMediaUrls)

    setIsSavingProgress(true)
    try {
      await onSaveProgress(formData, files, removedMediaUrls)
      console.log("[v0] onSaveProgress completed successfully")
    } catch (error) {
      console.error("[v0] Error in handleSaveProgress:", error)
    } finally {
      setIsSavingProgress(false)
      console.log("[v0] handleSaveProgress - reset isSavingProgress to false")
    }
  }, [onSaveProgress, isSavingProgress, formData, removedMediaUrls])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (isSubmittingState) {
        console.log("[v0] Already submitting, ignoring duplicate submission")
        return
      }

      console.log("[v0] DynamicFormRenderer - handleSubmit called")
      console.log("[v0] formData:", formData)
      console.log("[v0] existingMediaUrls:", existingMediaUrls)
      console.log("[v0] removedMediaUrls:", removedMediaUrls)
      
      const files = fileInputRef.current?.files ? Array.from(fileInputRef.current.files) : []
      console.log("[v0] mediaFiles from ref:", files.map(f => ({ name: f.name, size: f.size, type: f.type })))

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
        console.log("[v0] Calling onSubmit with:")
        console.log("[v0]   - formData:", formData)
        console.log("[v0]   - files count:", files.length)
        console.log("[v0]   - removedMediaUrls:", removedMediaUrls)
        
        await onSubmit(formData, files, removedMediaUrls)
        console.log("[v0] onSubmit completed successfully")
        
        setFilePreview([])
        setRemovedMediaUrls([])
        setExistingMediaUrls([]) // Clear existing media as it should be refreshed from server
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
        console.log("[v0] Cleared all media state after submission")
        
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
      existingMediaUrls,
      removedMediaUrls,
      memoizedSchema,
      getFormValue,
      onSubmit,
      onSubmittingChange,
      showSuccessDialogOnSubmit,
    ],
  )

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1, // Target 1MB
      maxWidthOrHeight: 1920, // Max dimension
      useWebWorker: true,
      fileType: file.type,
      initialQuality: 0.8,
    }

    try {
      console.log(`[v0] Compressing ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      const compressedFile = await imageCompression(file, options)
      console.log(`[v0] Compressed to: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`)
      
      // Return file with original name
      return new File([compressedFile], file.name, { type: compressedFile.type })
    } catch (error) {
      console.error('[v0] Compression error:', error)
      // Return original if compression fails
      return file
    }
  }

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFileUploadError("")

    const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB per image
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB per video
    const MAX_IMAGES = 4
    const MAX_VIDEOS = 2

    const images = files.filter(file => file.type.startsWith('image/'))
    const videos = files.filter(file => file.type.startsWith('video/'))

    const currentImages = filePreview.filter(f => f.file.type.startsWith('image/'))
    const currentVideos = filePreview.filter(f => f.file.type.startsWith('video/'))
    
    const existingImages = existingMediaUrls.filter(url => {
      const ext = url.split('.').pop()?.toLowerCase()
      return ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
    })
    const existingVideos = existingMediaUrls.filter(url => {
      const ext = url.split('.').pop()?.toLowerCase()
      return ext && ['mp4', 'mov', 'avi'].includes(ext)
    })
    
    const totalImages = currentImages.length + existingImages.length + images.length
    const totalVideos = currentVideos.length + existingVideos.length + videos.length
    
    if (totalImages > MAX_IMAGES) {
      setFileUploadError(
        `⚠️ Image Limit Reached: Maximum ${MAX_IMAGES} images allowed.\n` +
        `Current: ${currentImages.length + existingImages.length} images\n` +
        `Trying to add: ${images.length} more\n` +
        `Please remove ${totalImages - MAX_IMAGES} image(s) first.`
      )
      e.target.value = ""
      return
    }

    if (totalVideos > MAX_VIDEOS) {
      setFileUploadError(
        `⚠️ Video Limit Reached: Maximum ${MAX_VIDEOS} videos allowed.\n` +
        `Current: ${currentVideos.length + existingVideos.length} videos\n` +
        `Trying to add: ${videos.length} more\n` +
        `Please remove ${totalVideos - MAX_VIDEOS} video(s) first.`
      )
      e.target.value = ""
      return
    }

    for (const video of videos) {
      if (video.size > MAX_VIDEO_SIZE) {
        setFileUploadError(
          `⚠️ Video Too Large: "${video.name}" is ${(video.size / 1024 / 1024).toFixed(1)}MB.\n` +
          `Maximum allowed: 50MB per video.\n` +
          `Please compress or choose a smaller video file.`
        )
        e.target.value = ""
        return
      }
    }

    setIsCompressing(true)
    const processedFiles: File[] = []
    
    try {
      let current = 0
      const total = files.length
      
      for (const file of files) {
        current++
        setUploadingFileName(file.name)
        setUploadProgress(Math.round((current / total) * 100))
        
        if (file.type.startsWith('image/')) {
          // Compress images
          const compressed = await compressImage(file)
          
          // Check size after compression
          if (compressed.size > MAX_IMAGE_SIZE) {
            setFileUploadError(
              `⚠️ Image Still Too Large: "${file.name}" is ${(compressed.size / 1024 / 1024).toFixed(1)}MB even after compression.\n` +
              `Maximum allowed: 5MB per image.\n` +
              `Please try resizing the image or using a different format.`
            )
            e.target.value = ""
            setIsCompressing(false)
            setUploadProgress(0)
            setUploadingFileName("")
            return
          }
          
          processedFiles.push(compressed)
        } else {
          // Videos don't need compression (too heavy for client-side)
          processedFiles.push(file)
        }
      }

      const totalSize = processedFiles.reduce((sum, file) => sum + file.size, 0)
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2)

      console.log(`[v0] Files processed: ${images.length} images, ${videos.length} videos, ${totalSizeMB}MB total`)

      const newPreviews = await Promise.all(processedFiles.map(async (file) => {
        let preview: string | null = null
        
        if (file.type.startsWith('image/')) {
          preview = URL.createObjectURL(file)
        } else if (file.type.startsWith('video/')) {
          // Create video thumbnail
          preview = URL.createObjectURL(file)
        }
        
        return { file, preview }
      }))
      
      setFilePreview(prev => [...prev, ...newPreviews])
      
      if (fileInputRef.current) {
        const dt = new DataTransfer()
        // Add existing files
        const existingFiles = filePreview.map(p => p.file)
        existingFiles.forEach(f => dt.items.add(f))
        // Add new files
        processedFiles.forEach(f => dt.items.add(f))
        fileInputRef.current.files = dt.files
      }
      
    } catch (error) {
      console.error('[v0] File processing error:', error)
      setFileUploadError('❌ Error processing files. Please try again.')
      e.target.value = ""
    } finally {
      setIsCompressing(false)
      setUploadProgress(0)
      setUploadingFileName("")
    }
  }, [filePreview, existingMediaUrls])

  const removeMediaFile = useCallback((index: number) => {
    setFilePreview(prev => {
      const newPreview = prev.filter((_, i) => i !== index)
      
      // Clear the file input and create a new DataTransfer to rebuild file list
      if (fileInputRef.current) {
        const dt = new DataTransfer()
        newPreview.forEach(({ file }) => dt.items.add(file))
        fileInputRef.current.files = dt.files
      }
      
      return newPreview
    })
    console.log("[v0] Removed new media file at index:", index)
  }, [])

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

          {(isCompressing || uploadProgress > 0) && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm font-medium text-primary">
                  {isCompressing ? 'Compressing & processing files...' : 'Processing files...'}
                </p>
              </div>
              {uploadingFileName && (
                <p className="text-xs text-muted-foreground truncate">
                  Current: {uploadingFileName}
                </p>
              )}
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-right text-muted-foreground">{uploadProgress}%</p>
            </div>
          )}

          {existingMediaUrls.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-sm text-muted-foreground font-medium">
                Current media ({existingMediaUrls.length}):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {existingMediaUrls.map((url, index) => {
                  const ext = url.split('.').pop()?.toLowerCase() || ''
                  const isVideo = ['mp4', 'mov', 'avi', 'webm'].includes(ext)
                  
                  return (
                    <div key={index} className="relative group">
                      {isVideo ? (
                        <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-white/20 dark:border-white/10 bg-black/20">
                          <video
                            src={url}
                            className="w-full h-full object-cover"
                            muted
                          />
                          <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            Video
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeExistingMedia(url)}
                            className="absolute top-1 left-1 h-8 w-8 p-0 rounded-full shadow-lg sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
                            disabled={preview}
                            title="Remove this video"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="relative w-full aspect-square">
                          <Image
                            src={url || "/placeholder.svg"}
                            alt={`Existing media ${index + 1}`}
                            fill
                            className="rounded-lg object-cover border border-white/20 dark:border-white/10"
                            sizes="(max-width: 640px) 50vw, 33vw"
                          />
                          <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            Image
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeExistingMedia(url)}
                            className="absolute top-1 left-1 h-8 w-8 p-0 rounded-full shadow-lg sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
                            disabled={preview}
                            title="Remove this image"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {filePreview.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-sm text-primary font-medium">
                New media to upload ({filePreview.length}):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filePreview.map(({ file, preview }, index) => {
                  const isVideo = file.type.startsWith('video/')
                  const isImage = file.type.startsWith('image/')
                  
                  return (
                    <div key={index} className="relative group">
                      <div className="w-full aspect-square rounded-lg border-2 border-primary/50 bg-white/5 dark:bg-black/10 overflow-hidden flex flex-col items-center justify-center p-2">
                        {isImage && preview ? (
                          <div className="relative w-full h-full">
                            <Image
                              src={preview || "/placeholder.svg"}
                              alt={file.name}
                              fill
                              className="object-cover rounded"
                              sizes="(max-width: 640px) 50vw, 33vw"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="text-3xl mb-2">
                              {isVideo ? '🎥' : '📄'}
                            </div>
                            <div className="text-xs text-center truncate w-full px-1 font-medium">
                              {file.name}
                            </div>
                          </>
                        )}
                        <div className="absolute top-1 right-1 bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded font-medium">
                          {isVideo ? 'Video' : 'Image'}
                        </div>
                        <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {(file.size / (1024 * 1024)).toFixed(1)}MB
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeMediaFile(index)}
                        className="absolute -top-2 -right-2 h-7 w-7 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        disabled={preview}
                        title="Remove this file"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="bg-white/5 dark:bg-black/10 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-lg p-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/x-msvideo"
              multiple
              onChange={handleFileChange}
              className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3"
              disabled={preview || isCompressing}
            />
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <p className="font-medium">📋 Upload Limits & Auto-Compression:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>Maximum 4 images (JPG, PNG, GIF, WebP) - Auto-compressed to ~1MB each</li>
                <li>Maximum 2 videos (MP4, MOV) - 50MB max each (no compression)</li>
                <li>Images over 5MB will be automatically compressed before upload</li>
              </ul>
              <div className="mt-2 p-2 bg-white/5 rounded border border-white/10">
                <p className="text-xs font-medium text-foreground">
                  Current: {existingMediaUrls.filter(u => {
                    const ext = u.split('.').pop()?.toLowerCase()
                    return ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
                  }).length + filePreview.filter(f => f.file.type.startsWith('image/')).length}/4 images, {' '}
                  {existingMediaUrls.filter(u => {
                    const ext = u.split('.').pop()?.toLowerCase()
                    return ext && ['mp4', 'mov', 'avi'].includes(ext)
                  }).length + filePreview.filter(f => f.file.type.startsWith('video/')).length}/2 videos
                </p>
              </div>
            </div>
            {fileUploadError && (
              <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                <p className="text-xs text-red-400 whitespace-pre-line font-medium">{fileUploadError}</p>
              </div>
            )}
            {removedMediaUrls.length > 0 && (
              <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-md">
                <p className="text-xs text-amber-400 font-medium">
                  {removedMediaUrls.length} media file(s) will be removed
                </p>
              </div>
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
      filePreview, // Use filePreview here
      removeMediaFile,
      onSaveProgress,
      handleSaveProgress,
      isSavingProgress,
      isSubmittingState,
      submitButtonText,
      fileUploadError,
      removedMediaUrls,
      isCompressing,
      uploadProgress,
      uploadingFileName,
    ],
  )

  const handleSuccessDialogClose = useCallback(() => {
    setShowSuccessDialog(false)
  }, [])

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

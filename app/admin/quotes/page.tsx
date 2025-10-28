"use client"

import type React from "react"
import { toast } from "@/components/ui/use-toast"
import { AdminQuotesSkeleton } from "@/components/skeleton-loaders"
import { logger } from "@/lib/logger"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Trash2, Edit, Plus, Upload, X, ArrowLeft, Settings } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import Link from "next/link"
import { UserDropdown } from "@/components/user-dropdown"

interface NoticeboardItem {
  id: string
  title: string
  content: string
  author: string
  author_title: string
  year: string
  image_url: string
  is_active: boolean
  display_order: number
}

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<NoticeboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingQuote, setEditingQuote] = useState<NoticeboardItem | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    author: "",
    author_title: "",
    year: "",
    image_url: "",
    is_active: true,
    display_order: 0,
  })

  const supabase = createClient()

  useEffect(() => {
    fetchQuotes()
  }, [])

  const fetchQuotes = async () => {
    const { data, error } = await supabase
      .from("noticeboard_items")
      .select("*")
      .order("display_order", { ascending: true })

    if (error) {
      logger.error("Failed to fetch quotes", { error: error.message })
    } else {
      setQuotes(data || [])
    }
    setLoading(false)
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return null

    setUploading(true)
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      const { data, error } = await supabase.storage.from("quotes-images").upload(fileName, file)

      if (error) {
        logger.error("Failed to upload quote image", { error: error.message, fileName })
        return null
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("quotes-images").getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      logger.error("Quote image upload error", { error: error instanceof Error ? error.message : String(error) })
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file.",
        variant: "destructive",
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 5MB.",
        variant: "destructive",
      })
      return
    }

    setSelectedFile(file)

    const imageUrl = await handleFileUpload(file)
    if (imageUrl) {
      setFormData({ ...formData, image_url: imageUrl })
    }
  }

  const clearSelectedFile = () => {
    setSelectedFile(null)
    setFormData({ ...formData, image_url: "" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingQuote) {
      const { error } = await supabase.from("noticeboard_items").update(formData).eq("id", editingQuote.id)

      if (error) {
        logger.error("Failed to update quote", { error: error.message, quoteId: editingQuote.id })
        return
      }
    } else {
      const { error } = await supabase.from("noticeboard_items").insert([formData])

      if (error) {
        logger.error("Failed to create quote", { error: error.message })
        return
      }
    }

    setFormData({
      title: "",
      content: "",
      author: "",
      author_title: "",
      year: "",
      image_url: "",
      is_active: true,
      display_order: 0,
    })
    setSelectedFile(null)
    setEditingQuote(null)
    setIsCreating(false)
    fetchQuotes()
  }

  const handleEdit = (quote: NoticeboardItem) => {
    setEditingQuote(quote)
    setFormData({
      title: quote.title,
      content: quote.content,
      author: quote.author,
      author_title: quote.author_title,
      year: quote.year,
      image_url: quote.image_url,
      is_active: quote.is_active,
      display_order: quote.display_order,
    })
    setSelectedFile(null)
    setIsCreating(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quote?")) return

    const { error } = await supabase.from("noticeboard_items").delete().eq("id", id)

    if (error) {
      logger.error("Failed to delete quote", { error: error.message, quoteId: id })
    } else {
      fetchQuotes()
    }
  }

  const handleCancel = () => {
    setFormData({
      title: "",
      content: "",
      author: "",
      author_title: "",
      year: "",
      image_url: "",
      is_active: true,
      display_order: 0,
    })
    setSelectedFile(null)
    setEditingQuote(null)
    setIsCreating(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <header className="sticky top-0 z-50 py-3 sm:py-6 mb-6 sm:mb-12 bg-white/10 dark:bg-black/20 backdrop-blur-xl border-b border-white/20 dark:border-white/10">
          <div className="container mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                <Link href="/admin">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 sm:h-12 sm:w-12 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
                  >
                    <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
                  </Button>
                </Link>
                <Image
                  src="/everyone-logo.svg"
                  alt="EVERYONE"
                  width={180}
                  height={40}
                  className="w-28 sm:w-40 lg:w-fit h-10 sm:h-14 lg:h-16"
                  priority
                />
              </div>
            </div>
          </div>
        </header>
        <div className="container mx-auto p-6">
          <AdminQuotesSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <header className="sticky top-0 z-50 py-3 sm:py-6 mb-6 sm:mb-12 bg-white/10 dark:bg-black/20 backdrop-blur-xl border-b border-white/20 dark:border-white/10">
        <div className="container mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/admin">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 sm:h-12 sm:w-12 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 hover:scale-105 transition-all duration-300 active:scale-95"
                >
                  <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
                  <span className="sr-only">Back to Admin</span>
                </Button>
              </Link>
              <div className="flex items-center gap-2 sm:gap-3">
                <Image
                  src="/everyone-logo.svg"
                  alt="EVERYONE"
                  width={180}
                  height={40}
                  className="w-28 sm:w-40 lg:w-fit h-10 sm:h-14 lg:h-16"
                  priority
                />
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <UserDropdown />
              <Link href="/admin">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 sm:h-12 sm:w-12 bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 hover:scale-105 transition-all duration-300 active:scale-95"
                >
                  <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
                  <span className="sr-only">Admin Panel</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Manage Quotes</h1>
          <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Quote
          </Button>
        </div>

        {isCreating && (
          <Card>
            <CardHeader>
              <CardTitle>{editingQuote ? "Edit Quote" : "Create New Quote"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Quote title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="author">Author</Label>
                    <Input
                      id="author"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      placeholder="Author name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="author_title">Author Title</Label>
                    <Input
                      id="author_title"
                      value={formData.author_title}
                      onChange={(e) => setFormData({ ...formData, author_title: e.target.value })}
                      placeholder="Author title/position"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      placeholder="Publication year"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Author Image</Label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById("image-upload")?.click()}
                          disabled={uploading}
                          className="flex items-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          {uploading ? "Uploading..." : "Upload Image"}
                        </Button>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        {selectedFile && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{selectedFile.name}</span>
                            <Button type="button" variant="ghost" size="sm" onClick={clearSelectedFile}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="image_url" className="text-sm text-muted-foreground">
                          Or enter image URL manually
                        </Label>
                        <Input
                          id="image_url"
                          value={formData.image_url}
                          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>

                      {formData.image_url && (
                        <div className="mt-3">
                          <Label className="text-sm text-muted-foreground">Preview</Label>
                          <div className="w-24 h-24 relative mt-1">
                            <Image
                              src={formData.image_url || "/placeholder.svg"}
                              alt="Preview"
                              width={96}
                              height={96}
                              className="w-full h-full object-cover rounded border"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="display_order">Display Order</Label>
                    <Input
                      id="display_order"
                      type="number"
                      value={formData.display_order}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          display_order: Number.parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="content">Quote Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Enter the quote content..."
                    rows={4}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={uploading}>
                    {editingQuote ? "Update Quote" : "Create Quote"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {quotes.map((quote) => (
            <Card key={quote.id}>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  {quote.image_url && (
                    <div className="w-24 h-24 relative flex-shrink-0">
                      <Image
                        src={quote.image_url || "/placeholder.svg"}
                        alt={quote.author}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{quote.title || "Untitled"}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          by {quote.author} - {quote.author_title} ({quote.year})
                        </p>
                        <p className="text-sm mb-2 line-clamp-3">{quote.content}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Order: {quote.display_order}</span>
                          <span className={quote.is_active ? "text-green-600" : "text-red-600"}>
                            {quote.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(quote)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(quote.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {quotes.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No quotes found. Create your first quote!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

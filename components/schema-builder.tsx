"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, Eye, EyeOff, Settings, Move } from "lucide-react"
import { DynamicFormRenderer } from "./dynamic-form-renderer"

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

interface SchemaBuilderProps {
  initialSchema?: FormSchema | null
  onSchemaChange: (schema: FormSchema | null) => void
  className?: string
}

const SchemaBuilder = ({ initialSchema, onSchemaChange, className = "" }: SchemaBuilderProps) => {
  const [schema, setSchema] = useState<FormSchema>(
    initialSchema || {
      version: 1,
      fields: [],
    },
  )
  const [showPreview, setShowPreview] = useState(false)
  const [editingField, setEditingField] = useState<number | null>(null)

  const fieldTypes = [
    { value: "textarea", label: "Text Area", description: "Multi-line text input" },
    { value: "input", label: "Text Input", description: "Single-line text input" },
    { value: "url", label: "URL Input", description: "URL validation input" },
    { value: "select", label: "Dropdown", description: "Select from options" },
    { value: "group", label: "Repeating Group", description: "Group of fields that can repeat" },
  ]

  const addField = (type: FormField["type"]) => {
    const newField: FormField = {
      type,
      name: `field_${Date.now()}`,
      label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      required: false,
    }

    if (type === "textarea") {
      newField.minRows = 3
      newField.maxLength = 1000
    }

    if (type === "select") {
      newField.options = [
        { label: "Option 1", value: "option1" },
        { label: "Option 2", value: "option2" },
      ]
    }

    if (type === "group") {
      newField.fields = []
      newField.repeat = { min: 1, max: 5 }
    }

    const updatedSchema = {
      ...schema,
      fields: [...schema.fields, newField],
    }
    setSchema(updatedSchema)
    onSchemaChange(updatedSchema)
    setEditingField(schema.fields.length)
  }

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updatedFields = [...schema.fields]
    updatedFields[index] = { ...updatedFields[index], ...updates }

    const updatedSchema = { ...schema, fields: updatedFields }
    setSchema(updatedSchema)
    onSchemaChange(updatedSchema)
  }

  const removeField = (index: number) => {
    const updatedFields = schema.fields.filter((_, i) => i !== index)
    const updatedSchema = { ...schema, fields: updatedFields }
    setSchema(updatedSchema)
    onSchemaChange(updatedSchema)
    setEditingField(null)
  }

  const moveField = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= schema.fields.length) return

    const updatedFields = [...schema.fields]
    const temp = updatedFields[index]
    updatedFields[index] = updatedFields[newIndex]
    updatedFields[newIndex] = temp

    const updatedSchema = { ...schema, fields: updatedFields }
    setSchema(updatedSchema)
    onSchemaChange(updatedSchema)
  }

  const addOptionToSelect = (fieldIndex: number) => {
    const field = schema.fields[fieldIndex]
    if (field.type !== "select") return

    const newOption = {
      label: `Option ${(field.options?.length || 0) + 1}`,
      value: `option${(field.options?.length || 0) + 1}`,
    }
    updateField(fieldIndex, {
      options: [...(field.options || []), newOption],
    })
  }

  const updateOption = (fieldIndex: number, optionIndex: number, updates: { label?: string; value?: string }) => {
    const field = schema.fields[fieldIndex]
    if (field.type !== "select" || !field.options) return

    const updatedOptions = [...field.options]
    updatedOptions[optionIndex] = { ...updatedOptions[optionIndex], ...updates }
    updateField(fieldIndex, { options: updatedOptions })
  }

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const field = schema.fields[fieldIndex]
    if (field.type !== "select" || !field.options) return

    const updatedOptions = field.options.filter((_, i) => i !== optionIndex)
    updateField(fieldIndex, { options: updatedOptions })
  }

  const clearSchema = () => {
    const emptySchema = { version: 1, fields: [] }
    setSchema(emptySchema)
    onSchemaChange(null)
    setEditingField(null)
  }

  const renderFieldEditor = (field: FormField, index: number) => {
    const isEditing = editingField === index

    return (
      <Card
        key={index}
        className="bg-white/5 dark:bg-black/10 backdrop-blur-lg border border-white/20 dark:border-white/10"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <span className="capitalize">{field.type}</span>
              <span className="text-muted-foreground">•</span>
              <span>{field.label}</span>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => moveField(index, "up")}
                disabled={index === 0}
                className="h-8 w-8 p-0"
              >
                <Move className="h-3 w-3 rotate-180" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => moveField(index, "down")}
                disabled={index === schema.fields.length - 1}
                className="h-8 w-8 p-0"
              >
                <Move className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingField(isEditing ? null : index)}
                className="h-8 w-8 p-0"
              >
                <Settings className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeField(index)}
                className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {isEditing && (
          <CardContent className="pt-0 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground text-sm">Field Name</Label>
                <Input
                  value={field.name}
                  onChange={(e) => updateField(index, { name: e.target.value })}
                  className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
                />
              </div>
              <div>
                <Label className="text-foreground text-sm">Label</Label>
                <Input
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
                />
              </div>
            </div>

            <div>
              <Label className="text-foreground text-sm">Helper Text</Label>
              <Input
                value={field.helperText || ""}
                onChange={(e) => updateField(index, { helperText: e.target.value })}
                placeholder="Optional helper text for users"
                className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={field.required || false}
                onCheckedChange={(checked) => updateField(index, { required: checked })}
              />
              <Label className="text-foreground text-sm">Required field</Label>
            </div>

            {field.type === "textarea" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground text-sm">Min Rows</Label>
                  <Input
                    type="number"
                    value={field.minRows || 3}
                    onChange={(e) => updateField(index, { minRows: Number.parseInt(e.target.value) })}
                    min="1"
                    max="10"
                    className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-foreground text-sm">Max Length</Label>
                  <Input
                    type="number"
                    value={field.maxLength || 1000}
                    onChange={(e) => updateField(index, { maxLength: Number.parseInt(e.target.value) })}
                    min="10"
                    className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
                  />
                </div>
              </div>
            )}

            {field.type === "select" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-foreground text-sm">Options</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addOptionToSelect(index)}
                    className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Option
                  </Button>
                </div>
                <div className="space-y-2">
                  {field.options?.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex gap-2">
                      <Input
                        placeholder="Label"
                        value={option.label}
                        onChange={(e) => updateOption(index, optionIndex, { label: e.target.value })}
                        className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
                      />
                      <Input
                        placeholder="Value"
                        value={option.value}
                        onChange={(e) => updateOption(index, optionIndex, { value: e.target.value })}
                        className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(index, optionIndex)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {field.type === "group" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground text-sm">Min Instances</Label>
                  <Input
                    type="number"
                    value={field.repeat?.min || 1}
                    onChange={(e) =>
                      updateField(index, {
                        repeat: { ...field.repeat!, min: Number.parseInt(e.target.value) },
                      })
                    }
                    min="1"
                    className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-foreground text-sm">Max Instances</Label>
                  <Input
                    type="number"
                    value={field.repeat?.max || 5}
                    onChange={(e) =>
                      updateField(index, {
                        repeat: { ...field.repeat!, max: Number.parseInt(e.target.value) },
                      })
                    }
                    min="1"
                    max="10"
                    className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
                  />
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Form Schema Builder</h3>
          <p className="text-sm text-muted-foreground">Design the submission form for this mission</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
          >
            {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showPreview ? "Hide Preview" : "Show Preview"}
          </Button>
          {schema.fields.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSchema}
              className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-red-400 hover:text-red-300"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {showPreview && schema.fields.length > 0 && (
        <Card className="bg-white/5 dark:bg-black/10 backdrop-blur-lg border border-white/20 dark:border-white/10">
          <CardHeader>
            <CardTitle className="text-foreground">Form Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <DynamicFormRenderer
              schema={schema}
              onSubmit={() => {}} // Preview only
              preview={true}
            />
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {fieldTypes.map((type) => (
            <Button
              key={type.value}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addField(type.value as FormField["type"])}
              className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10"
            >
              <Plus className="h-3 w-3 mr-2" />
              Add {type.label}
            </Button>
          ))}
        </div>

        {schema.fields.length === 0 ? (
          <Card className="bg-white/5 dark:bg-black/10 backdrop-blur-lg border border-white/20 dark:border-white/10">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No form fields yet. Add fields above to get started.</p>
              <p className="text-sm text-muted-foreground mt-2">
                If no schema is defined, users will see a simple journal entry form.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">{schema.fields.map((field, index) => renderFieldEditor(field, index))}</div>
        )}
      </div>

      {/* Hidden input to store the schema JSON for form submission */}
      <input type="hidden" name="submission_schema" value={schema.fields.length > 0 ? JSON.stringify(schema) : ""} />
    </div>
  )
}

export default SchemaBuilder

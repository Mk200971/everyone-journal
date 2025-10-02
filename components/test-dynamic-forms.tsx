"use client"

import { useState } from "react"
import { DynamicFormRenderer } from "./dynamic-form-renderer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Test schemas based on the requirements document
const testSchemas = {
  pledge: {
    version: 1,
    fields: [
      {
        type: "textarea",
        name: "commitment_1",
        label: "Commitment 1",
        required: true,
        minRows: 3,
        helperText: "State a specific behavior you will practice.",
      },
      {
        type: "textarea",
        name: "commitment_2",
        label: "Commitment 2",
        required: true,
        minRows: 3,
        helperText: "State a specific behavior you will practice.",
      },
      {
        type: "textarea",
        name: "commitment_3",
        label: "Commitment 3",
        required: true,
        minRows: 3,
        helperText: "State a specific behavior you will practice.",
      },
      {
        type: "textarea",
        name: "commitment_4",
        label: "Commitment 4",
        required: true,
        minRows: 3,
        helperText: "State a specific behavior you will practice.",
      },
      {
        type: "textarea",
        name: "commitment_5",
        label: "Commitment 5",
        required: true,
        minRows: 3,
        helperText: "State a specific behavior you will practice.",
      },
    ],
  },
  customerObsessed: {
    version: 1,
    fields: [
      {
        type: "textarea",
        name: "daily_practice",
        label: "Daily Practice",
        required: true,
        minRows: 4,
        helperText: "What will you do every day?",
      },
      {
        type: "textarea",
        name: "weekly_ritual",
        label: "Weekly Ritual",
        required: false,
        minRows: 4,
        helperText: "What will you do weekly?",
      },
      {
        type: "textarea",
        name: "monthly_focus",
        label: "Monthly Focus",
        required: false,
        minRows: 4,
        helperText: "What will you focus on monthly?",
      },
    ],
  },
  callListening: {
    version: 1,
    fields: [
      {
        type: "group",
        name: "calls",
        label: "Call Notes",
        repeat: { min: 3, max: 3 },
        fields: [
          {
            type: "textarea",
            name: "notes",
            label: "Notes for this call",
            required: true,
            minRows: 4,
            helperText: "Document key points, customer feedback, and observations from this call.",
          },
        ],
      },
      {
        type: "textarea",
        name: "summary",
        label: "Overall Summary (What stood out? Pain points? Opportunities? Actions?)",
        required: true,
        minRows: 6,
        helperText:
          "Provide a comprehensive summary addressing what stood out, pain points identified, opportunities discovered, and recommended actions.",
      },
    ],
  },
  socialListening: {
    version: 1,
    fields: [
      {
        type: "group",
        name: "interactions",
        label: "Social Interactions",
        repeat: { min: 3, max: 3 },
        fields: [
          {
            type: "url",
            name: "comment_url",
            label: "Comment URL",
            required: true,
            helperText: "Provide the direct link to the social media comment or post.",
          },
          {
            type: "select",
            name: "sentiment",
            label: "Sentiment",
            required: true,
            options: [
              { label: "Positive", value: "positive" },
              { label: "Neutral", value: "neutral" },
              { label: "Negative", value: "negative" },
            ],
            helperText: "Classify the overall sentiment of the interaction.",
          },
          {
            type: "textarea",
            name: "response_text",
            label: "Your Response",
            required: true,
            minRows: 3,
            helperText: "Document your response or planned response to this interaction.",
          },
        ],
      },
    ],
  },
  valueProposition: {
    version: 1,
    fields: [
      {
        type: "textarea",
        name: "pitch_structure",
        label: "Pitch Structure (Brand House cues)",
        required: true,
        minRows: 5,
        helperText: "Structure your pitch using Brand House framework and key messaging cues.",
      },
      {
        type: "textarea",
        name: "pitch_simple",
        label: "Pitch to a 5-year-old",
        required: true,
        minRows: 4,
        helperText: "Explain your value proposition in simple, plain language that a child could understand.",
      },
    ],
  },
  elevates: {
    version: 1,
    fields: [
      {
        type: "textarea",
        name: "takeaway_1",
        label: "Key Takeaway 1",
        required: true,
        minRows: 3,
        maxLength: 400,
        helperText: "What was the most important insight or lesson from this content?",
      },
      {
        type: "textarea",
        name: "takeaway_2",
        label: "Key Takeaway 2",
        required: true,
        minRows: 3,
        maxLength: 400,
        helperText: "What was the second most valuable insight you gained?",
      },
      {
        type: "textarea",
        name: "takeaway_3",
        label: "Key Takeaway 3",
        required: true,
        minRows: 3,
        maxLength: 400,
        helperText: "What was the third key learning point?",
      },
      {
        type: "textarea",
        name: "takeaway_4",
        label: "Key Takeaway 4 (Optional)",
        required: false,
        minRows: 3,
        maxLength: 400,
        helperText: "Any additional insights worth noting?",
      },
      {
        type: "textarea",
        name: "takeaway_5",
        label: "Key Takeaway 5 (Optional)",
        required: false,
        minRows: 3,
        maxLength: 400,
        helperText: "Any final thoughts or reflections?",
      },
    ],
  },
}

export function TestDynamicForms() {
  const [selectedSchema, setSelectedSchema] = useState<string>("pledge")
  const [submissionResults, setSubmissionResults] = useState<any[]>([])

  const handleTestSubmission = (answers: any, mediaFiles: File[]) => {
    console.log("[v0] Test submission received:", { answers, mediaFiles })

    const result = {
      timestamp: new Date().toISOString(),
      schema: selectedSchema,
      answers,
      mediaFiles: mediaFiles.map((f) => ({ name: f.name, size: f.size, type: f.type })),
    }

    setSubmissionResults((prev) => [result, ...prev])

    alert(`Test submission successful!\nSchema: ${selectedSchema}\nAnswers: ${JSON.stringify(answers, null, 2)}`)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">Dynamic Forms Test Suite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-foreground font-medium">Select Test Schema:</label>
            <Select value={selectedSchema} onValueChange={setSelectedSchema}>
              <SelectTrigger className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pledge">A01 - My EVERYONE Pledge (5 commitments)</SelectItem>
                <SelectItem value="customerObsessed">A02 - Customer Obsessed, Everyday (1-3 boxes)</SelectItem>
                <SelectItem value="callListening">CM02 - Call Listening (3 call notes + summary)</SelectItem>
                <SelectItem value="socialListening">LM02 - Social Listening (3 interactions)</SelectItem>
                <SelectItem value="valueProposition">LM01 - Value Proposition 101 (2 boxes)</SelectItem>
                <SelectItem value="elevates">Elevates - Books/Podcasts/Videos (3-5 takeaways)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-white/5 dark:bg-black/10 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Test Form</h3>
            <DynamicFormRenderer schema={testSchemas[selectedSchema]} onSubmit={handleTestSubmission} />
          </div>

          {submissionResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Test Results</h3>
              {submissionResults.map((result, index) => (
                <Card
                  key={index}
                  className="bg-white/5 dark:bg-black/10 backdrop-blur-lg border border-white/20 dark:border-white/10"
                >
                  <CardHeader>
                    <CardTitle className="text-sm text-foreground">
                      Test #{submissionResults.length - index} - {result.schema} -{" "}
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs text-muted-foreground bg-black/20 p-3 rounded overflow-auto max-h-40">
                      {JSON.stringify(result.answers, null, 2)}
                    </pre>
                    {result.mediaFiles.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-foreground">Media Files:</p>
                        <ul className="text-xs text-muted-foreground">
                          {result.mediaFiles.map((file, i) => (
                            <li key={i}>
                              {file.name} ({file.type}, {Math.round(file.size / 1024)}KB)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

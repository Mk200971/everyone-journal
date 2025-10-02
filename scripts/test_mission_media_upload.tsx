"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBrowserClient } from "@supabase/ssr"

export default function TestMissionMediaUpload() {
  const [testResults, setTestResults] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const addResult = (message: string) => {
    console.log(`[v0] Test: ${message}`)
    setTestResults((prev) => [...prev, message])
  }

  const runTests = async () => {
    setIsRunning(true)
    setTestResults([])

    try {
      // Test 1: Check if missions table has image_url column
      addResult("🔍 Testing database schema...")
      const { data: missions, error: missionsError } = await supabase
        .from("missions")
        .select("id, title, image_url")
        .limit(1)

      if (missionsError) {
        addResult(`❌ Database schema test failed: ${missionsError.message}`)
        return
      }
      addResult("✅ Database schema test passed - image_url column exists")

      // Test 2: Check if missions-media bucket exists
      addResult("🔍 Testing storage bucket...")
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

      if (bucketsError) {
        addResult(`❌ Storage bucket test failed: ${bucketsError.message}`)
        return
      }

      const missionsBucket = buckets?.find((bucket) => bucket.name === "missions-media")
      if (!missionsBucket) {
        addResult("❌ missions-media bucket not found")
        return
      }
      addResult("✅ Storage bucket test passed - missions-media bucket exists")

      // Test 3: Test file upload if file is selected
      if (selectedFile) {
        addResult("🔍 Testing file upload...")
        const fileName = `test-${Date.now()}-${selectedFile.name}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("missions-media")
          .upload(fileName, selectedFile)

        if (uploadError) {
          addResult(`❌ File upload test failed: ${uploadError.message}`)
          return
        }

        addResult("✅ File upload test passed")

        // Test 4: Get public URL
        addResult("🔍 Testing public URL generation...")
        const { data: urlData } = supabase.storage.from("missions-media").getPublicUrl(fileName)

        if (urlData.publicUrl) {
          addResult(`✅ Public URL test passed: ${urlData.publicUrl}`)

          // Test 5: Update a mission with the image URL
          if (missions && missions.length > 0) {
            addResult("🔍 Testing mission update with image...")
            const { error: updateError } = await supabase
              .from("missions")
              .update({ image_url: urlData.publicUrl })
              .eq("id", missions[0].id)

            if (updateError) {
              addResult(`❌ Mission update test failed: ${updateError.message}`)
            } else {
              addResult("✅ Mission update test passed")
            }
          }

          // Clean up test file
          await supabase.storage.from("missions-media").remove([fileName])
          addResult("🧹 Test file cleaned up")
        }
      } else {
        addResult("⚠️ No file selected - skipping upload tests")
      }

      // Test 6: Check admin permissions
      addResult("🔍 Testing admin permissions...")
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        addResult("❌ No authenticated user found")
        return
      }

      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()

      if (profile?.is_admin) {
        addResult("✅ Admin permissions test passed")
      } else {
        addResult("⚠️ Current user is not an admin - upload feature may be restricted")
      }

      addResult("🎉 All tests completed!")
    } catch (error) {
      addResult(`❌ Unexpected error: ${error}`)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/10">
          <CardHeader>
            <CardTitle className="text-2xl text-foreground">Mission Media Upload Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="test-file">Select a test image (optional)</Label>
              <Input
                id="test-file"
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="bg-white/5 border-white/20"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <Button onClick={runTests} disabled={isRunning} className="w-full">
              {isRunning ? "Running Tests..." : "Run Mission Media Tests"}
            </Button>

            {testResults.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Test Results:</h3>
                <div className="bg-black/20 rounded-lg p-4 max-h-96 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <div key={index} className="text-sm font-mono text-foreground mb-1">
                      {result}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import { createClient } from "@/lib/supabase/server"

interface ConversationMessage {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const conversationContext =
      conversationHistory.length > 0
        ? `\n\nPrevious conversation context:\n${conversationHistory
            .map((msg: ConversationMessage) => `${msg.role}: ${msg.content}`)
            .join("\n")}\n\nCurrent message: "${message}"`
        : `User query: "${message}"`

    const dataAnalysisPrompt = `You are an AI assistant that determines what data is needed to answer a question. Consider the conversation history for context. Respond with ONLY a valid JSON object.

Application Schema:
- profiles: (id, name, email, total_points, created_at, updated_at)
- missions: (id, title, description, points_value, type, resource_id, created_at, updated_at)
- submissions: (id, user_id, mission_id, text_submission, media_url, points_awarded, status, created_at, updated_at)
- resources: (id, title, description, type, url, created_at)

Query Categories:
1. GREETING: Simple greetings like "hi", "hello", "hey"
2. USER_ANALYSIS: Questions about users, engagement, leaderboards, participation
3. MISSION_ANALYSIS: Questions about missions, completion rates, popular missions
4. PERFORMANCE_TRENDS: Questions about trends over time, growth patterns
5. RESOURCE_ANALYSIS: Questions about learning resources and their effectiveness
6. GENERAL_INSIGHTS: Broad questions asking for overall insights or recommendations
7. FOLLOW_UP: Follow-up questions that reference previous conversation

Response Format:
- For greetings: {"intent": "greeting"}
- For analysis: {"intent": "analysis", "category": "USER_ANALYSIS|MISSION_ANALYSIS|PERFORMANCE_TRENDS|RESOURCE_ANALYSIS|GENERAL_INSIGHTS|FOLLOW_UP", "query": "SQL_QUERY"}

${conversationContext}`

    const { text: queryAnalysis } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: dataAnalysisPrompt,
      maxTokens: 500,
    })

    let queryPlan
    try {
      const jsonMatch = queryAnalysis.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[0] : queryAnalysis.trim()
      queryPlan = JSON.parse(jsonString)

      if (!queryPlan.intent) {
        throw new Error("Invalid query plan structure - missing intent")
      }
    } catch (parseError) {
      console.error("Failed to parse query analysis:", queryAnalysis)
      queryPlan = {
        intent: "analysis",
        category: "GENERAL_INSIGHTS",
        query: "comprehensive_data",
      }
    }

    let queryResult
    if (queryPlan.intent === "greeting") {
      const [profilesData, missionsData, submissionsData] = await Promise.all([
        supabase.from("profiles").select("id, name, total_points").order("total_points", { ascending: false }).limit(5),
        supabase.from("missions").select("id, title, type, points_value").limit(5),
        supabase.from("submissions").select("id, status, created_at").eq("status", "approved").limit(10),
      ])

      queryResult = {
        topUsers: profilesData.data || [],
        recentMissions: missionsData.data || [],
        recentSubmissions: submissionsData.data || [],
        stats: {
          totalUsers: profilesData.data?.length || 0,
          totalMissions: missionsData.data?.length || 0,
          approvedSubmissions: submissionsData.data?.length || 0,
        },
      }
    } else {
      if (queryPlan.query === "comprehensive_data" || !queryPlan.query) {
        // Get comprehensive data for general insights
        const [profilesData, missionsData, submissionsData, resourcesData] = await Promise.all([
          supabase.from("profiles").select("*").order("total_points", { ascending: false }),
          supabase.from("missions").select("*").order("created_at", { ascending: false }),
          supabase
            .from("submissions")
            .select(`
            *,
            profiles!inner(name, total_points),
            missions!inner(title, type, points_value)
          `)
            .eq("status", "approved")
            .order("created_at", { ascending: false }),
          supabase.from("resources").select("*"),
        ])

        queryResult = {
          profiles: profilesData.data || [],
          missions: missionsData.data || [],
          submissions: submissionsData.data || [],
          resources: resourcesData.data || [],
          analytics: {
            totalUsers: profilesData.data?.length || 0,
            totalMissions: missionsData.data?.length || 0,
            totalSubmissions: submissionsData.data?.length || 0,
            totalResources: resourcesData.data?.length || 0,
            avgPointsPerUser:
              profilesData.data?.reduce((sum, p) => sum + (p.total_points || 0), 0) / (profilesData.data?.length || 1),
            missionTypes: [...new Set(missionsData.data?.map((m) => m.type) || [])],
            completionRate: submissionsData.data?.length / (missionsData.data?.length || 1),
          },
        }
      } else {
        // Execute custom SQL query if provided
        try {
          const { data } = await supabase.rpc("execute_query", { query_text: queryPlan.query })
          queryResult = data || {}
        } catch (error) {
          // Fallback to comprehensive data if custom query fails
          const { data } = await supabase
            .from("submissions")
            .select(`
              *,
              profiles!inner(name, total_points),
              missions!inner(title, type, points_value)
            `)
            .eq("status", "approved")
            .limit(50)
          queryResult = data || []
        }
      }
    }

    const conversationHistoryText =
      conversationHistory.length > 0
        ? `\n\nConversation History:\n${conversationHistory
            .map((msg: ConversationMessage) => `${msg.role === "user" ? "User" : "EJ"}: ${msg.content}`)
            .join("\n")}\n`
        : ""

    const finalAnswerPrompt = `You are EJ, a friendly and insightful AI assistant for Learning & Development professionals using the "EVERYONE Journal" app.

Your personality traits:
- **Warm & Welcoming**: Always greet users enthusiastically and make them feel valued
- **Data-Driven Expert**: Analyze patterns, trends, and insights from the provided data
- **Proactive Advisor**: Offer actionable recommendations and creative mission ideas
- **Honest & Transparent**: If data is limited, acknowledge it while still providing value
- **Engagement-Focused**: Help L&D teams boost employee participation and learning outcomes
- **Context-Aware**: Reference previous conversation when relevant and build upon earlier discussions

${conversationHistoryText}

Current user message: "${message}"
Query category: ${queryPlan.category || "general"}
Data provided:
${JSON.stringify(queryResult, null, 2)}

Response Guidelines:
1. **For greetings**: Welcome them warmly and explain what insights you can provide
2. **For follow-up questions**: Reference previous conversation context naturally
3. **For analysis requests**: 
   - Start with a direct answer to their question using the data
   - Identify 2-3 key insights or patterns from the data
   - Suggest 1-2 actionable recommendations or new mission ideas
   - Use specific numbers and percentages when available
   - Build upon previous insights if this is a follow-up

4. **Always include**:
   - Specific data points (numbers, percentages, trends)
   - At least one proactive insight they might not have considered
   - A suggestion for improving engagement or learning outcomes
   - Natural references to previous conversation when relevant

Keep your response conversational, insightful, and under 200 words unless they ask for detailed analysis.`

    const { text: finalAnswer } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: finalAnswerPrompt,
      maxTokens: 1000,
    })

    const getRecordCount = (result: any): number => {
      if (!result) return 0
      if (Array.isArray(result)) return result.length
      if (typeof result === "object") return Object.keys(result).length
      return 0
    }

    const updatedHistory = [
      ...conversationHistory,
      {
        role: "user" as const,
        content: message,
        timestamp: new Date().toISOString(),
      },
      {
        role: "assistant" as const,
        content: finalAnswer,
        timestamp: new Date().toISOString(),
      },
    ]

    return NextResponse.json({
      response: finalAnswer,
      conversationHistory: updatedHistory,
      dataUsed: {
        intent: queryPlan.intent,
        category: queryPlan.category || "general",
        recordCount: getRecordCount(queryResult),
      },
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ error: "Failed to process chat request" }, { status: 500 })
  }
}

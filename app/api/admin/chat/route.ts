import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

interface ConversationMessage {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

async function fetchRelevantData(message: string, supabase: any) {
  const lowerMessage = message.toLowerCase()
  const data: any = {}

  try {
    const needsUsers = /user|profile|people|member|employee|person|who|staff|team/i.test(message)
    const needsMissions =
      /mission|task|assignment|activity|challenge|action|core|lite|elevate|suggest|recommend|create|new/i.test(message)
    const needsSubmissions = /submission|complete|finish|done|progress|approve|reject|pending|draft/i.test(message)
    const needsResources = /resource|material|content|learning|article|video|link/i.test(message)
    const needsEngagement = /engagement|trend|activity|participation|stat|analytic|insight|performance/i.test(message)
    const needsLeaderboard = /top|best|leader|rank|high|winner|champion|score|point/i.test(message)
    const needsSpecificUser = /\b[A-Z][a-z]+\s[A-Z][a-z]+\b/.test(message)
    const needsFeedback = /feedback|issue|problem|report|bug|complaint/i.test(message)
    const needsLikes = /like|popular|favorite|social/i.test(message)
    const needsQuotes = /quote|inspiration|noticeboard|announcement|message/i.test(message)
    const needsDepartments = /department|team|division|group/i.test(message)
    const needsCountries = /country|location|region|geography/i.test(message)

    if (needsUsers || needsLeaderboard || lowerMessage.includes("how many")) {
      const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true })
      data.totalUsers = userCount || 0

      const { data: topUsers } = await supabase
        .from("profiles")
        .select("name, total_points, department, job_title, country")
        .order("total_points", { ascending: false })
        .limit(5)

      if (topUsers && topUsers.length > 0) {
        data.topUsers = topUsers

        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("total_points, department, country, is_admin, is_deleted")

        if (allProfiles) {
          const activeUsers = allProfiles.filter((u) => !u.is_deleted)
          data.activeUsers = activeUsers.length
          data.avgPoints = Math.round(
            activeUsers.reduce((sum, u) => sum + (u.total_points || 0), 0) / activeUsers.length,
          )
          data.adminCount = activeUsers.filter((u) => u.is_admin).length

          // Department breakdown
          const deptCounts = activeUsers.reduce((acc: any, u: any) => {
            const dept = u.department || "Unknown"
            acc[dept] = (acc[dept] || 0) + 1
            return acc
          }, {})
          data.departments = Object.entries(deptCounts)
            .sort(([, a]: any, [, b]: any) => b - a)
            .slice(0, 5)
            .map(([dept, count]) => ({ dept, count }))

          // Country breakdown
          const countryCounts = activeUsers.reduce((acc: any, u: any) => {
            const country = u.country || "Unknown"
            acc[country] = (acc[country] || 0) + 1
            return acc
          }, {})
          data.countries = Object.entries(countryCounts)
            .sort(([, a]: any, [, b]: any) => b - a)
            .slice(0, 5)
            .map(([country, count]) => ({ country, count }))
        }
      }
    }

    if (needsSpecificUser) {
      const nameMatch = message.match(/\b[A-Z][a-z]+\s[A-Z][a-z]+\b/)
      if (nameMatch) {
        const searchName = nameMatch[0]
        const { data: users } = await supabase
          .from("profiles")
          .select("id, name, total_points, department, job_title, country, created_at")
          .ilike("name", `%${searchName}%`)

        if (users && users.length > 0) {
          const user = users[0]

          const { data: submissions } = await supabase
            .from("submissions")
            .select("status, points_awarded, created_at")
            .eq("user_id", user.id)

          const submissionStats = {
            total: submissions?.length || 0,
            approved: submissions?.filter((s) => s.status === "approved").length || 0,
            pending: submissions?.filter((s) => s.status === "pending").length || 0,
            rejected: submissions?.filter((s) => s.status === "rejected").length || 0,
            draft: submissions?.filter((s) => s.status === "draft").length || 0,
          }

          data.specificUser = {
            name: user.name,
            points: user.total_points,
            department: user.department,
            jobTitle: user.job_title,
            country: user.country,
            memberSince: new Date(user.created_at).toLocaleDateString(),
            submissions: submissionStats,
          }
        }
      }
    }

    if (needsMissions || needsEngagement) {
      const { count: missionCount } = await supabase.from("missions").select("*", { count: "exact", head: true })
      data.totalMissions = missionCount || 0

      const { data: missions } = await supabase
        .from("missions")
        .select("id, type, points_value, title, description, due_date")
        .order("created_at", { ascending: false })
        .limit(10)

      if (missions) {
        data.missions = missions.map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description ? m.description.substring(0, 100) + (m.description.length > 100 ? "..." : "") : "",
          points: m.points_value,
          type: m.type,
          dueDate: m.due_date,
        }))

        const { data: allMissions } = await supabase.from("missions").select("type, points_value")
        if (allMissions) {
          const typeStats = allMissions.reduce((acc: any, m: any) => {
            const type = m.type || "Unknown"
            if (!acc[type]) {
              acc[type] = { count: 0, totalPoints: 0 }
            }
            acc[type].count++
            acc[type].totalPoints += m.points_value || 0
            return acc
          }, {})

          data.missionTypes = Object.entries(typeStats).map(([type, stats]: any) => ({
            type,
            count: stats.count,
            avgPoints: Math.round(stats.totalPoints / stats.count),
          }))
        }

        const missionStats = await Promise.all(
          missions.slice(0, 5).map(async (mission) => {
            const { count: submissionCount } = await supabase
              .from("submissions")
              .select("*", { count: "exact", head: true })
              .eq("mission_id", mission.id)

            const { count: approvedCount } = await supabase
              .from("submissions")
              .select("*", { count: "exact", head: true })
              .eq("mission_id", mission.id)
              .eq("status", "approved")

            return {
              id: mission.id,
              title: mission.title,
              submissions: submissionCount || 0,
              completions: approvedCount || 0,
              completionRate: submissionCount ? Math.round((approvedCount / submissionCount) * 100) : 0,
            }
          }),
        )

        data.missionPerformance = missionStats.sort((a, b) => a.completionRate - b.completionRate)
      }
    }

    if (needsSubmissions || needsEngagement || needsMissions) {
      const { data: allSubmissions } = await supabase
        .from("submissions")
        .select("status, points_awarded, created_at, mission_id")

      if (allSubmissions) {
        const statusCounts = {
          total: allSubmissions.length,
          approved: allSubmissions.filter((s) => s.status === "approved").length,
          pending: allSubmissions.filter((s) => s.status === "pending").length,
          rejected: allSubmissions.filter((s) => s.status === "rejected").length,
          draft: allSubmissions.filter((s) => s.status === "draft").length,
        }

        const totalPointsAwarded = allSubmissions
          .filter((s) => s.status === "approved")
          .reduce((sum, s) => sum + (s.points_awarded || 0), 0)

        data.submissions = {
          ...statusCounts,
          approvalRate: statusCounts.total ? Math.round((statusCounts.approved / statusCounts.total) * 100) : 0,
          totalPointsAwarded,
          avgPointsPerApproval: statusCounts.approved ? Math.round(totalPointsAwarded / statusCounts.approved) : 0,
        }

        const missionCounts = allSubmissions.reduce((acc: any, s: any) => {
          acc[s.mission_id] = (acc[s.mission_id] || 0) + 1
          return acc
        }, {})

        const topMissionIds = Object.entries(missionCounts)
          .sort(([, a]: any, [, b]: any) => b - a)
          .slice(0, 5)
          .map(([id]) => id)

        if (topMissionIds.length > 0) {
          const { data: popularMissions } = await supabase
            .from("missions")
            .select("title, type, points_value")
            .in("id", topMissionIds)

          if (popularMissions) {
            data.popularMissions = popularMissions.map((m, i) => ({
              title: m.title,
              type: m.type,
              points: m.points_value,
              submissions: Object.values(missionCounts).sort((a: any, b: any) => b - a)[i],
            }))
          }
        }
      }
    }

    if (needsResources) {
      const { count: resourceCount } = await supabase.from("resources").select("*", { count: "exact", head: true })
      data.totalResources = resourceCount || 0

      const { data: resources } = await supabase.from("resources").select("type").limit(100)
      if (resources) {
        const typeCounts = resources.reduce((acc: any, r: any) => {
          const type = r.type || "Unknown"
          acc[type] = (acc[type] || 0) + 1
          return acc
        }, {})
        data.resourceTypes = Object.entries(typeCounts).map(([type, count]) => ({ type, count }))
      }
    }

    if (needsEngagement || lowerMessage.includes("trend") || lowerMessage.includes("recent")) {
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      const { count: recentSubs } = await supabase
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString())

      const { count: previousSubs } = await supabase
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", fourteenDaysAgo.toISOString())
        .lt("created_at", sevenDaysAgo.toISOString())

      const { count: recentUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString())

      data.trends = {
        last7Days: {
          newUsers: recentUsers || 0,
          submissions: recentSubs || 0,
        },
        previous7Days: {
          submissions: previousSubs || 0,
        },
        trend: recentSubs > previousSubs ? "up" : recentSubs < previousSubs ? "down" : "stable",
        change: previousSubs ? Math.round(((recentSubs - previousSubs) / previousSubs) * 100) : 0,
      }
    }

    if (needsFeedback) {
      const { count: feedbackCount } = await supabase.from("feedback").select("*", { count: "exact", head: true })
      data.totalFeedback = feedbackCount || 0

      const { data: recentFeedback } = await supabase
        .from("feedback")
        .select("issue_type, status")
        .order("created_at", { ascending: false })
        .limit(20)

      if (recentFeedback) {
        const typeCounts = recentFeedback.reduce((acc: any, f: any) => {
          const type = f.issue_type || "Unknown"
          acc[type] = (acc[type] || 0) + 1
          return acc
        }, {})
        data.feedbackTypes = Object.entries(typeCounts).map(([type, count]) => ({ type, count }))

        const statusCounts = recentFeedback.reduce((acc: any, f: any) => {
          const status = f.status || "Unknown"
          acc[status] = (acc[status] || 0) + 1
          return acc
        }, {})
        data.feedbackStatus = statusCounts
      }
    }

    if (needsLikes || needsEngagement) {
      const { count: totalLikes } = await supabase.from("likes").select("*", { count: "exact", head: true })
      data.totalLikes = totalLikes || 0

      const { data: submissions } = await supabase
        .from("submissions")
        .select("id, mission_id")
        .eq("status", "approved")
        .limit(50)

      if (submissions) {
        const likeCounts = await Promise.all(
          submissions.map(async (sub) => {
            const { count } = await supabase
              .from("likes")
              .select("*", { count: "exact", head: true })
              .eq("submission_id", sub.id)
            return { submissionId: sub.id, missionId: sub.mission_id, likes: count || 0 }
          }),
        )

        const topLiked = likeCounts.sort((a, b) => b.likes - a.likes).slice(0, 3)
        if (topLiked.length > 0 && topLiked[0].likes > 0) {
          data.mostLikedSubmissions = topLiked
        }
      }
    }

    if (needsQuotes) {
      const { count: quoteCount } = await supabase
        .from("noticeboard_items")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)

      data.activeQuotes = quoteCount || 0
    }

    return data
  } catch (error) {
    logger.error("Error fetching relevant data", error)
    return data
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const supabase = await createClient()

    logger.info("Fetching relevant data for message", { message })
    const relevantData = await fetchRelevantData(message, supabase)
    logger.info("Fetched data", { dataKeys: Object.keys(relevantData) })

    const conversationContext = conversationHistory
      .slice(-3)
      .map((msg: ConversationMessage) => `${msg.role === "user" ? "Q" : "A"}: ${msg.content}`)
      .join("\n")

    const dataContext =
      Object.keys(relevantData).length > 0 ? `\n\nDATA:\n${JSON.stringify(relevantData, null, 0)}` : ""

    const systemPrompt = `You are EJ, the AI analytics assistant for EVERYONE Journal - a Learning & Development platform.

PLATFORM KNOWLEDGE:
- Mission Types: Action (quick tasks), Core (essential learning), Lite (light activities), Elevate (advanced challenges)
- Submission Workflow: draft → pending → approved/rejected
- Points System: Users earn points when submissions are approved
- User Profiles: name, department, job_title, country, bio, customer_obsession
- Resources: Learning materials linked to missions
- Social Features: Likes on submissions, community activity feed
- Admin Tools: Mission management, submission review, user analytics

YOUR ROLE: Help L&D admins understand engagement, identify trends, track performance, and make data-driven decisions.

RESPONSE STYLE:
- Direct & concise (under 100 words unless analysis requested)
- Use exact numbers from DATA section
- Provide actionable insights: "85% approval rate - excellent engagement!"
- Format lists with bullets
- Highlight trends: "↑ 15% vs last week"
- If data missing, suggest what you can help with

EXAMPLE QUERIES YOU HANDLE:
- "How many users?" → Total count + active users
- "Who's on top?" → Leaderboard with points
- "Mission stats?" → Types, completion rates, popular missions
- "Engagement trends?" → Weekly comparison, growth rate
- "Department breakdown?" → User distribution by dept
- "[Name]'s progress?" → User-specific stats and submissions
- "Suggest missions" → Recommend missions based on performance data
- "What missions need promotion?" → Identify low-completion missions
- "Best performing missions?" → Show high-engagement missions

MISSION SUGGESTIONS:
When asked to suggest or recommend missions, analyze the data:
- Low completion rate (<30%) = needs promotion or revision
- High completion rate (>70%) = proven successful, create similar
- New missions (few submissions) = need testing and promotion
- Popular missions (many submissions) = high interest, expand on theme
- Mission types: Recommend variety (Action, Core, Lite, Elevate) for balanced learning

${conversationContext ? `RECENT:\n${conversationContext}\n` : ""}${dataContext}`

    logger.info("Generating AI response")

    const result = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system: systemPrompt,
      prompt: message,
      maxTokens: 300,
      temperature: 0.7,
    })

    logger.info("AI response generated successfully")

    const updatedHistory = [
      ...conversationHistory,
      {
        role: "user" as const,
        content: message,
        timestamp: new Date().toISOString(),
      },
      {
        role: "assistant" as const,
        content: result.text,
        timestamp: new Date().toISOString(),
      },
    ]

    return NextResponse.json({
      response: result.text,
      conversationHistory: updatedHistory,
    })
  } catch (error) {
    logger.error("Chat API error", error)
    return NextResponse.json(
      {
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

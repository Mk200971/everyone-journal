/**
 * Centralized Logging Service
 * Provides structured logging with different severity levels
 * In production, this can be extended to send logs to external services like Sentry
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogContext {
  userId?: string
  action?: string
  metadata?: Record<string, unknown>
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development"

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : ""
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage("debug", message, context))
    }
  }

  /**
   * Log general information
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(this.formatMessage("info", message, context))
    }
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage("warn", message, context))
  }

  /**
   * Log errors with full stack trace
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error(this.formatMessage("error", message, context), {
      error: errorMessage,
      stack: errorStack,
    })

    // In production, send to external service (e.g., Sentry)
    // if (!this.isDevelopment) {
    //   Sentry.captureException(error, { contexts: { custom: context } })
    // }
  }
}

// Export singleton instance
export const logger = new Logger()

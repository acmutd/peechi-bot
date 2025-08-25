import { Collection, Message, type MessageContextMenuCommandInteraction } from 'discord.js'
import { v4 } from 'uuid'
import { Logger } from '../utils/logger'

type Report = {
  id: string
  originalInteraction: MessageContextMenuCommandInteraction
  message: Message
  createdAt: number
}

class ReportService {
  private reports: Collection<string, Report>
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly REPORT_EXPIRY_MS = 30 * 60 * 1000 // 30 minutes
  private readonly MAX_REPORTS = 1000 // Prevent memory leaks

  constructor() {
    this.reports = new Collection()
    this.startCleanupInterval()
  }

  createReport(interaction: MessageContextMenuCommandInteraction): string {
    // Clean up if we have too many reports
    if (this.reports.size >= this.MAX_REPORTS) {
      this.cleanupExpiredReports()

      // If still too many, remove oldest ones
      if (this.reports.size >= this.MAX_REPORTS) {
        const sortedReports = [...this.reports.values()].sort((a, b) => a.createdAt - b.createdAt)
        const toRemove = sortedReports.slice(0, this.MAX_REPORTS / 2)
        toRemove.forEach(report => this.reports.delete(report.id))
        Logger.warn(`Removed ${toRemove.length} old reports due to memory pressure`)
      }
    }

    const reportId = v4()
    const report: Report = {
      id: reportId,
      originalInteraction: interaction,
      message: interaction.targetMessage,
      createdAt: Date.now(),
    }
    this.reports.set(reportId, report)
    Logger.info(`Created report ${reportId}`)
    return reportId
  }

  async getReport(id: string): Promise<Report | undefined> {
    if (!id || typeof id !== 'string') {
      return undefined
    }

    const report = this.reports.get(id)
    if (!report) {
      return undefined
    }

    // Check if report has expired
    if (Date.now() - report.createdAt > this.REPORT_EXPIRY_MS) {
      this.reports.delete(id)
      Logger.info(`Report ${id} expired and was removed`)
      return undefined
    }

    return report
  }

  async deleteReport(id: string): Promise<boolean> {
    if (!id || typeof id !== 'string') {
      return false
    }

    const existed = this.reports.has(id)
    this.reports.delete(id)
    if (existed) {
      Logger.info(`Deleted report ${id}`)
    }
    return existed
  }

  private cleanupExpiredReports(): void {
    const now = Date.now()
    const beforeSize = this.reports.size

    for (const [id, report] of this.reports) {
      if (now - report.createdAt > this.REPORT_EXPIRY_MS) {
        this.reports.delete(id)
      }
    }

    const removedCount = beforeSize - this.reports.size
    if (removedCount > 0) {
      Logger.info(`Cleaned up ${removedCount} expired reports`)
    }
  }

  private startCleanupInterval(): void {
    // Clean up expired reports every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredReports()
    }, 10 * 60 * 1000)
  }

  getReportCount(): number {
    return this.reports.size
  }

  // For testing purposes
  clearAllReports(): void {
    this.reports.clear()
    Logger.info('Cleared all reports')
  }

  // Cleanup when service is destroyed
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.reports.clear()
  }
}

export default new ReportService()

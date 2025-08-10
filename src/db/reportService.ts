import { Collection, Message, type MessageContextMenuCommandInteraction } from 'discord.js'
import { v4 } from 'uuid'

type Report = {
  id: string
  originalInteraction: MessageContextMenuCommandInteraction
  message: Message
}

class ReportService {
  private reports: Collection<string, Report>

  constructor() {
    this.reports = new Collection()
  }

  createReport(interaction: MessageContextMenuCommandInteraction): string {
    const reportId = v4()
    const report = {
      id: reportId,
      originalInteraction: interaction,
      message: interaction.targetMessage,
    }
    this.reports.set(reportId, report)
    return reportId
  }

  getReport(id: string): Report | undefined {
    return this.reports.get(id)
  }

  deleteReport(id: string) {
    this.reports.delete(id)
  }
}

export default new ReportService()

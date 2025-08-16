import { DiscordBot } from './bot/'
import { envService } from './utils/env'
import { Logger } from './utils/logger'

try {
  await envService.initialize()
  const bot = new DiscordBot()
  await bot.start()
} catch (error) {
  console.error('Failed to start bot:', error)

  try {
    Logger.critical('Failed to start bot application', error)
  } catch (e) {
    console.error('Failed to log critical error:', e)
  }

  process.exit(1)
}

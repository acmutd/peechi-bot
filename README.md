# Peechi Bot

A Discord bot built with Bun, TypeScript, Discord.js, and Firebase for server moderation and verification features.

## Features

- **Slash Commands**: Modern Discord slash command support
- **Context Menus**: Right-click context menu commands
- **Button Interactions**: Interactive button components
- **Firebase Integration**: Configuration and data storage
- **Verification System**: User verification workflow
- **Report System**: User reporting functionality
- **Logging**: Comprehensive logging system

## Prerequisites

Before setting up the project, make sure you have:

- [Bun](https://bun.sh) runtime installed (v1.2.20 or later)
- A Discord application with bot token
- Firebase project with Firestore database
- Firebase service account key file

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/acmutd/peechi-bot.git
   cd peechi-bot
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

## Configuration

### 1. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token
GUILD_ID=your_discord_guild_id
CLIENT_ID=your_discord_application_client_id

# Firebase Configuration
FIRESTORE_PROJECT_ID=your_firebase_project_id
FIRESTORE_KEY_FILENAME=path/to/your/firebase-service-account-key.json

# Environment (this is defaulted to development)
NODE_ENV=development
```

### 2. Discord Bot Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or use an existing one
3. Go to the "Bot" section and create a bot
4. Copy the bot token and add it to your `.env` file as `DISCORD_TOKEN`
5. Copy the application ID and add it to your `.env` file as `CLIENT_ID`
6. Get your Discord server (guild) ID and add it to your `.env` file as `GUILD_ID`

**Required Bot Permissions:**

- Send Messages
- Use Slash Commands
- Manage Messages
- Read Message History
- Manage Roles (if using verification features)

### 3. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore Database
3. Generate a service account key:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save the JSON file securely
   - Add the file path to your `.env` file as `FIRESTORE_KEY_FILENAME`

### 4. Firebase Configuration Document

Create a configuration document in your Firestore database:

**Collection:** `config`
**Document ID:** `environment`
**Document Structure:**

```json
{
  "ROLES": {
    "VERIFIED": "role_id_for_verified_users"
  },
  "CHANNELS": {
    "VERIFICATION": "channel_id_for_verification",
    "ADMIN": "channel_id_for_admin_notifications",
    "ERROR": "channel_id_for_error_logs"
  }
}
```

Replace the IDs with actual Discord role and channel IDs from your server.

## Usage

### Development

Run the bot in development mode with auto-reload:

```bash
bun run dev
```

### Production

1. **Build the project**

   ```bash
   bun run build
   ```

2. **Start the bot**

   ```bash
   bun start
   ```

### Available Scripts

- `bun run dev` - Run in development mode with file watching
- `bun run build` - Build the project to `dist/` directory
- `bun start` - Run the built production version

## Project Structure

```bash

src/
├── bot/           # Main bot class and initialization
├── buttons/       # Button interaction handlers
├── commands/      # Slash commands
├── constants/     # Bot configuration constants
├── ctx-menus/     # Context menu commands
├── db/           # Database services (Firebase)
├── events/        # Discord event handlers
├── types/         # TypeScript type definitions
└── utils/         # Utility functions and services
```

## Commands

The bot includes several built-in commands:

- `/ping` - Check bot responsiveness
- `/verify` - User verification command
- `/fail` - Testing/debugging command

## Adding New Features

### Adding a Slash Command

1. Create a new file in `src/commands/`
2. Export a command object with `data` and `execute` properties:

```typescript
import { SlashCommandBuilder } from 'discord.js'
import type { Command } from '../types'

export const myCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('mycommand')
    .setDescription('Description of my command'),
  async execute(interaction) {
    await interaction.reply('Hello from my command!')
  },
}
```

### Adding a Button Handler

1. Create a new file in `src/buttons/`
2. Export a button object with `baseId` and `execute` properties:

```typescript
import type { ButtonCommand } from '../types'

export const myButton: ButtonCommand = {
  baseId: 'my_button',
  async execute(interaction) {
    await interaction.reply('Button clicked!')
  },
}
```

### Adding an Event Handler

1. Create a new file in `src/events/`
2. Export event properties:

```typescript
import type { Events } from 'discord.js'

export const name = Events.MessageCreate
export const once = false

export async function execute(message) {
  // Handle the event
}
```

## Error Handling

The bot includes comprehensive error handling and logging:

- All errors are logged to the console and error channel
- Critical errors trigger graceful shutdowns
- Failed command/event loading is logged but doesn't crash the bot

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Troubleshooting

### Common Issues

**"Environment initialization failed"**

- Check that all required environment variables are set
- Verify Firebase service account key file exists and is readable
- Ensure Firestore database is properly configured

**"Commands not deploying"**

- Verify `DISCORD_TOKEN`, `CLIENT_ID`, and `GUILD_ID` are correct
- Check bot permissions in Discord server
- Ensure bot is invited to the server with proper scopes

**"Firebase connection failed"**

- Verify `FIRESTORE_PROJECT_ID` matches your Firebase project
- Check service account key file permissions
- Ensure Firestore is enabled in Firebase console

### Logs

Check the console output for detailed error messages. The bot uses structured logging with different severity levels (info, warn, error, critical).

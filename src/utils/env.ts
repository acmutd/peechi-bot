type Env = {
  discordToken: string
  firestore: FirestoreEnv
  guildId: string
  clientId: string
  modChannelId: string
}
type FirestoreEnv = {
  projectId: string
  keyFilename: string
}

const devConfig: Env = {
  discordToken: Bun.env.DEV_DISCORD_TOKEN!,
  guildId: Bun.env.DEV_GUILD_ID!,
  clientId: Bun.env.DEV_CLIENT_ID!,
  firestore: {
    projectId: Bun.env.DEV_FIRESTORE_PROJECT_ID!,
    keyFilename: Bun.env.DEV_FIRESTORE_KEY_FILENAME!,
  },
  modChannelId: Bun.env.DEV_MOD_CHANNEL_ID!,
}

const prodConfig: Env = {
  discordToken: Bun.env.PROD_DISCORD_TOKEN!,
  guildId: Bun.env.PROD_GUILD_ID!,
  clientId: Bun.env.PROD_CLIENT_ID!,
  firestore: {
    projectId: Bun.env.PROD_FIRESTORE_PROJECT_ID!,
    keyFilename: Bun.env.PROD_FIRESTORE_KEY_FILENAME!,
  },
  modChannelId: Bun.env.PROD_MOD_CHANNEL_ID!,
}

const env = Bun.env.NODE_ENV === 'production' ? prodConfig : devConfig

export default env

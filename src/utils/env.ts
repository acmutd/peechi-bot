type Env = {
  discordToken: string
  firestore: FirestoreEnv
  guildId: string
  clientId: string
  modChannelId: string
  verificationChannelId: string
  roles: Roles
}
type FirestoreEnv = {
  projectId: string
  keyFilename: string
}
type Roles = {
  verified: string
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
  verificationChannelId: Bun.env.DEV_VERIFICATION_CHANNEL_ID!,
  roles: {
    verified: Bun.env.DEV_VERIFIED_ROLE!,
  },
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
  verificationChannelId: Bun.env.PROD_VERIFICATION_CHANNEL_ID!,
  roles: {
    verified: Bun.env.PROD_VERIFIED_ROLE!,
  },
}

const env = Bun.env.NODE_ENV === 'production' ? prodConfig : devConfig

export default env

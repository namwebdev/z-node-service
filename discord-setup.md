## How to get `DISCORD_WEBHOOK_URL`:

1. Go to your Discord server.
2. Right-click on the channel you want to send the logs to.
3. Click on `Edit Channel`.
4. Go to `Integrations`.
5. Click on `Create Webhook`.
6. Copy the `Webhook URL`.

## How to get `DISCORD_BOT_TOKEN` & `DISCORD_CHANNEL_ID`:

### Get `DISCORD_BOT_TOKEN`:
1. Go to [Discord Developer Portal](https://discord.com/developers/applications).
2. Click on `New Application`.
3. Give your application a name.
4. Go to `Bot` and click on `Add Bot`.
5. Click `Reset Token` -> Copy & paste the `YOUR_BOT_TOKEN` to `DISCORD_BOT_TOKEN` environment variable.

### Get `DISCORD_CHANNEL_ID`:
_(need to enable **Developer Mode** in Discord first)_
1. Go to your Discord server.
2. Go to your Discord server.
3. Right-click on the channel you want to send the logs to.
4. Click on `Copy ID`.
5. Paste the ID in the `DISCORD_CHANNEL_ID` environment variable.

## Add the Bot to Your Server

- In Discord Developer Portal, go to OAuth2 > URL Generator.
- Under Scopes, check "bot".
- Under Bot Permissions, select:

    - ✅ Read Messages

- Copy the generated OAuth2 URL and open it in a browser.
- Select your server and click **Authorize**.
- Now, you can start your bot using the `TOKEN` and `CHANNEL_ID`.

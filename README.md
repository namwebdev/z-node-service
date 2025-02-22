# Logger with Discord

This is a simple logger that sends logs to a Discord channel. It uses the discord webhook to send the logs.

- Will need `DISCORD_WEBHOOK_URL` to be set in the environment variables. _(how to get is described in [discord-setup.md](discord-setup.md))_

- If want to export the logs to a file, `DISCORD_BOT_TOKEN` & `DISCORD_CHANNEL_ID` is required. _(how to get is described in [discord-setup.md](discord-setup.md))_

## How to test
```bash
node index.js
```

```sh
curl -X POST http://localhost:3000/api/messages -H "Content-Type: application/json" -d '{"message": "Hello, World!"}'
```

### How to export logs from Discord channel:

```bash
node export-log.js
```
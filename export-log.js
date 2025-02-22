const fs = require("fs");
const path = require("path");
const axios = require("axios");
require('dotenv').config();
const { Client, IntentsBitField } = require('discord.js');

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

// Initialize Discord client with required intents
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ]
});

// Login to Discord
client.login(DISCORD_BOT_TOKEN);

// Wait for client to be ready
let clientReady = new Promise((resolve) => {
  client.once('ready', () => {
    console.log('Discord client ready');
    resolve();
  });
});

// Helper function to ensure logs directory exists
function ensureLogsDirectory() {
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }
  return logsDir;
}

async function getChannelMessages(limit = 100) {
  try {
    const response = await axios.get(
      `https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages?limit=${limit}`,
      {
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!Array.isArray(response.data)) {
      throw new Error('Expected array of messages from Discord API');
    }

    // Format the messages
    const messages = response.data.map(message => ({
      timestamp: new Date(message.timestamp).toISOString(),
      content: message.content,
      author: message.author.username,
      id: message.id
    }));

    // Sort messages by timestamp (newest first)
    messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Write to file in logs directory
    const logsDir = ensureLogsDirectory();
    const filename = path.join(logsDir, `channel_logs_${new Date().toISOString().split('T')[0]}.txt`);
    const formattedLogs = messages.map(msg =>
      `[${msg.timestamp}] ${msg.author}: ${msg.content}`
    ).join('\n');
    fs.writeFileSync(filename, formattedLogs);
    console.log(`Channel logs exported successfully to ${filename}`);

    return messages;
  } catch (error) {
    console.error('Error fetching channel messages:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Function to get messages with pagination
async function getAllChannelMessages() {
  try {
    let allMessages = [];
    let lastMessageId = null;
    const limit = 100; // Discord API limit per request

    while (true) {
      let url = `https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages?limit=${limit}`;
      if (lastMessageId) {
        url += `&before=${lastMessageId}`;
      }

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        }
      });

      const messages = response.data;
      if (!messages.length) break;

      allMessages = allMessages.concat(messages);
      lastMessageId = messages[messages.length - 1].id;

      // Discord API has rate limits, so let's add a small delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Format and save all messages (newest first)
    const formattedMessages = allMessages
      .map(message => ({
        timestamp: new Date(message.timestamp),
        content: message.content,
        author: message.author.username,
        id: message.id
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    // Write to file in logs directory
    const logsDir = ensureLogsDirectory();
    const filename = path.join(logsDir, `all_channel_logs_${new Date().toISOString().split('T')[0]}.txt`);
    const formattedLogs = formattedMessages
      .map(msg => `[${msg.timestamp.toISOString()}] ${msg.author}: ${msg.content}`)
      .join('\n');
    fs.writeFileSync(filename, formattedLogs);
    console.log(`All channel logs exported successfully to ${filename}`);

    return formattedMessages;
  } catch (error) {
    console.error('Error fetching all channel messages:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Helper function to format date in Vietnam timezone
function getVietnamTime() {
  const now = new Date();
  // Convert to Vietnam time (UTC+7)
  const vietnamTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  return vietnamTime.toISOString().replace(/[:.]/g, '-').slice(0, 16);
}

async function exportLogs() {
  try {
    // Wait for client to be ready before proceeding
    await clientReady;

    // Parse the webhook URL to get ID and token
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const matches = webhookUrl.match(/\/webhooks\/(\d+)\/(.+)/);
    if (!matches) {
      throw new Error('Invalid webhook URL format');
    }

    const [, webhookId, webhookToken] = matches;

    // Use the main client to fetch messages
    const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
    if (!channel) {
      throw new Error('Channel not found');
    }

    let messages = [];
    let lastId;

    while (true) {
      const options = { limit: 100 };
      if (lastId) {
        options.before = lastId;
      }

      const fetchedMessages = await channel.messages.fetch(options);
      if (fetchedMessages.size === 0) break;

      // Filter only webhook messages from our specific webhook
      const webhookMessages = fetchedMessages.filter(msg =>
        msg.webhookId === webhookId
      );

      messages = messages.concat(Array.from(webhookMessages.values()));
      lastId = fetchedMessages.last().id;
    }

    // Format and save messages
    const formattedLogs = messages
      // No need to reverse() since we want newest first
      .map(msg => {
        const msgTime = new Date(msg.createdTimestamp + (7 * 60 * 60 * 1000));
        const timestamp = msgTime.toISOString();
        const content = msg.content || '';
        return {
          timestamp: msgTime,
          text: `[${timestamp}] ${msg.author.username}: ${content}`
        };
      })
      // Sort by timestamp (newest first)
      .sort((a, b) => b.timestamp - a.timestamp)
      // Get just the formatted text
      .map(log => log.text)
      .join('\n');

    // Ensure logs directory exists and create full file path
    const logsDir = ensureLogsDirectory();
    const filename = path.join(logsDir, `webhook_logs_${getVietnamTime()}.txt`);
    fs.writeFileSync(filename, formattedLogs);
    console.log(`Webhook logs exported to ${filename}`);

    // Cleanup: Logout client after we're done
    client.destroy();

  } catch (error) {
    console.error('Error exporting webhook logs:', error);
    // Ensure client is destroyed even if there's an error
    client.destroy();
    throw error;
  }
}

// if (require.main === module) {
//   const args = process.argv.slice(2);
//   const command = args[0];

//   if (!command) {
//     console.log('Usage: node export-log.js <command>');
//     console.log('Available commands:');
//     console.log('  webhook  - Export logs from webhook');
//     console.log('  channel  - Export last 100 messages from channel');
//     console.log('  all      - Export all messages from channel');
//     process.exit(1);
//   }

//   switch (command.toLowerCase()) {  // Make command case-insensitive
//     case 'webhook':
//       exportLogs()
//         .then(() => process.exit(0))
//         .catch(() => process.exit(1));
//       break;
//     case 'channel':
//       getChannelMessages()
//         .then(() => process.exit(0))
//         .catch(() => process.exit(1));
//       break;
//     case 'all':
//       getAllChannelMessages()
//         .then(() => process.exit(0))
//         .catch(() => process.exit(1));
//       break;
//     default:
//       console.log('Invalid command. Available commands: webhook, channel, or all');
//       process.exit(1);
//   }
// }

exportLogs()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));


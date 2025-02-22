const axios = require('axios');
require('dotenv').config();

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

class DiscordLogger {
  static async log(message, metadata = {}) {
    try {
      const timestamp = new Date().toISOString();
      const ip = metadata.ip || 'unknown';
      const statusCode = metadata.statusCode || '';
      
      // Format: [Timestamp] IP - StatusCode - Message
      const formattedMessage = `[${timestamp}] ${ip} - ${statusCode} - ${message}`;

      await axios.post(DISCORD_WEBHOOK_URL, {
        content: formattedMessage,
      });
    } catch (error) {
      console.error('Error sending log to Discord:', error.message);
    }
  }

  static async info(message, metadata = {}) {
    await this.log(`ℹ️ ${message}`, metadata);
  }

  static async error(message, metadata = {}) {
    await this.log(`❌ ${message}`, metadata);
  }

  static async warn(message, metadata = {}) {
    await this.log(`⚠️ ${message}`, metadata);
  }

  static async success(message, metadata = {}) {
    await this.log(`✅ ${message}`, metadata);
  }
}

module.exports = DiscordLogger;

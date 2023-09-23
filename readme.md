## Discord Radio StkngEsk

**How to use:**

Create a `config.json` with your custom discord bot token and desired transmission gap

1. `npm install`
2. `npm run start`

Discord bot permissions:
```typescript
    GatewayIntentBits.Guilds, // Channels permissions
    GatewayIntentBits.GuildMessages, // Send channel messages
    GatewayIntentBits.GuildVoiceStates, // Voice channel permissions (Connect/Speak)
    GatewayIntentBits.MessageContent // Read messages/View Channels
```
<img src="./assets/1.PNG" alt="Example config 1" width="512" height="400" />
<img src="./assets/2.PNG" alt="Example config 2" width="512" height="400" />

Then after joined the discord bot to your server, you can join to a voice channel and send the message `prendelo` in a text channel
where the bot is, then bot will join to the voice channel

How to play music:

A fastify api endpoint will be on port 3322

use endpoint `/play` GET request with queryParam `?url={your-youtube-video-url}`

i.e.: GET `http://localhost:3322/play?url={your-youtube-video-url}`
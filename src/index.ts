import {
  NoSubscriberBehavior,
  createAudioPlayer,
  createAudioResource,
  entersState,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  joinVoiceChannel,
} from "@discordjs/voice";
import { GatewayIntentBits } from "discord-api-types/v10";
import {
  Client,
  type VoiceBasedChannel,
  Events,
  Channel,
  ChannelType,
} from "discord.js";
import ytdl from "ytdl-core";
import { start } from "./api";

const { token, maxTransmissionGap } = require("../../config.json") as {
  token: string;
  maxTransmissionGap: number;
};

let actualChannelId: string = "";

const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Play,
    maxMissedFrames: Math.round(maxTransmissionGap / 20),
  },
});

export function attachRecorder(url: string) {
  player.play(
    createAudioResource(
      ytdl(url, {
        filter: "audioonly",
        highWaterMark: 1 << 62,
        liveBuffer: 1 << 62,
        dlChunkSize: 0,
        quality: "lowestaudio",
      })
    )
  );
}

player.on("stateChange", (oldState, newState) => {
  if (
    oldState.status === AudioPlayerStatus.Idle &&
    newState.status === AudioPlayerStatus.Playing
  ) {
    const channel: Channel | undefined =
      client.channels.cache.get(actualChannelId);
    if (channel && channel.type == ChannelType.GuildText) {
      channel.send("No hay pa escuchar");
    }
  } else if (newState.status === AudioPlayerStatus.Idle) {
    const channel: Channel | undefined =
      client.channels.cache.get(actualChannelId);
    if (channel && channel.type == ChannelType.GuildText) {
      channel.send("Se acabo la muca");
    }
  }
});

async function connectToChannel(channel: VoiceBasedChannel) {
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  });
  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    return connection;
  } catch (error) {
    connection.destroy();
    throw error;
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

client.on(Events.ClientReady, () => {
  console.log("discord.js client is ready!");
});

client.on(Events.MessageCreate, async (message) => {
  if (!message.guildId) return;
  if (message.content === "prendelo") {
    const channel = message.member?.voice.channel;
    if (channel) {
      try {
        actualChannelId = message.channelId;
        const connection = await connectToChannel(channel);
        connection.subscribe(player);
        await message.reply("Prendido perro");
      } catch (error) {
        await message.reply("Algo pasoo");
        console.error(error);
      }
    } else {
      actualChannelId = "";
      await message.reply("No estas en un canal capo");
    }
  }
});

start();
void client.login(token);

import {
  NoSubscriberBehavior,
  createAudioPlayer,
  createAudioResource,
  entersState,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  joinVoiceChannel,
  VoiceConnection,
} from "@discordjs/voice";
import { GatewayIntentBits } from "discord-api-types/v10";
import {
  Client,
  type VoiceBasedChannel,
  Events,
  Channel,
  ChannelType,
} from "discord.js";
import { start } from "./api";
import { video_basic_info, stream } from "play-dl";

const { token, maxTransmissionGap } = require("../../config.json") as {
  token: string;
  maxTransmissionGap: number;
};

let actualChannelId: string = "";

let actualConnection: VoiceConnection | undefined = undefined;
let actualVoiceChannelId: string = "";

const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Play,
    maxMissedFrames: Math.round(maxTransmissionGap / 20),
  },
});

export async function attachRecorder(url: string) {
  const { stream: playingNow, type } = await stream(url);

  player.play(
    createAudioResource(playingNow, {
      inputType: type,
    })
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
      setInterval(async () => {
        const updatedChannel: Channel | null = await client.channels.fetch(
          actualVoiceChannelId
        );
        if (
          updatedChannel &&
          updatedChannel.type == ChannelType.GuildVoice &&
          updatedChannel.members.size == 1 &&
          actualConnection
        ) {
          actualConnection.destroy();
        }
      }, 300000);
    }
  }
});

async function connectToChannel(
  channel: VoiceBasedChannel
): Promise<VoiceConnection> {
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
        actualVoiceChannelId = channel.id;
        actualChannelId = message.channelId;
        actualConnection = await connectToChannel(channel);
        actualConnection.subscribe(player);
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

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
import { Client, type VoiceBasedChannel, Events, Channel, ChannelType } from "discord.js";
import ytdl from "ytdl-core";

const { token, maxTransmissionGap } = require("../config.json") as {
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

function attachRecorder() {
  player.play(
    createAudioResource(
      ytdl("https://www.youtube.com/watch?v=M3xtWbaLhss", {
        filter: "audioonly",
      })
    )
  );
  console.log("Attached recorder - ready to go!");
}

player.on("stateChange", (oldState, newState) => {
  if (
    oldState.status === AudioPlayerStatus.Idle &&
    newState.status === AudioPlayerStatus.Playing
  ) {
    console.log("Playing audio output on audio player");
    const channel: Channel | undefined = client.channels.cache.get(actualChannelId);
    if (channel && channel.type == ChannelType.GuildText) {
        channel.send("No music to play")
    }
  } else if (newState.status === AudioPlayerStatus.Idle) {
    console.log("Playback has stopped. Attempting to restart.");
    const channel: Channel | undefined = client.channels.cache.get(actualChannelId);
    if (channel && channel.type == ChannelType.GuildText) {
        channel.send("No music to play")
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
  // attachRecorder();
});

client.on(Events.MessageCreate, async (message) => {
  console.log(message);
    attachRecorder()
  if (!message.guildId) return;
  if (message.content === "-join") {

    const channel = message.member?.voice.channel;
    if (channel) {
      try {
        actualChannelId = message.channelId;
        const connection = await connectToChannel(channel);
        connection.subscribe(player);
        await message.reply("Playing now!");
      } catch (error) {
        console.error(error);
      }
    } else {
      actualChannelId = "";
      await message.reply("Join a voice channel then try again!");
    }
  }
});

void client.login(token);

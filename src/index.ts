import {
  NoSubscriberBehavior,
  createAudioPlayer,
  createAudioResource,
  entersState,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  joinVoiceChannel,
  VoiceConnection,
  AudioPlayer,
} from "@discordjs/voice";
import { GatewayIntentBits } from "discord-api-types/v10";
import {
  Client,
  type VoiceBasedChannel,
  Events,
  Channel,
  ChannelType,
  Message,
} from "discord.js";
import { IConfig } from "@interfaces/IConfig.interface";
import config from "../config.json";
import messages from "../catalogs/messages.json";
import { IMessages } from "@interfaces/IMessages.interface";
import { InputsEnum } from "../enums/Inputs.enum";
import ytdl from "@distube/ytdl-core";
import { playlist_info } from "play-dl";

let actualConnection: VoiceConnection | undefined;
let actualChannelId: string;
let actualVoiceChannelId: string;
let isLooping: boolean = false;
let initialPlay: boolean = true;
let songList: string[] = [];
let actualSong: number = 0;

const { token, maxTransmissionGap, cookies }: IConfig = config;
const {
  noMusic,
  noMusicLeft,
  channelConnectSuccess,
  channelConnectFailed,
  userNotInVoiceChannel,
  xupalo,
}: IMessages = messages;

const player: AudioPlayer = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Play,
    maxMissedFrames: Math.round(maxTransmissionGap / 20),
  },
});

const agent = ytdl.createProxyAgent({ uri: "http://152.26.229.66:9443" }, cookies);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

async function addUrlToList(message: Message<boolean>): Promise<void> {
  const startingString: string = InputsEnum.ADD_URL;
  const regex = new RegExp(`\\b${startingString}\\b`, "gi");
  const [, url]: string[] = message.content.split(regex);

  if (!url.includes("list=")) {
    songList.push(url);
  } else {
    await verifyPlaylist(url);
  }

  if (initialPlay) {
    await attachRecorder();
    initialPlay = false;
  }
}

async function verifyPlaylist(url: string) {
  const playlistResult = await playlist_info(url, {
    incomplete: true,
  });
  const playlistVideos = await playlistResult.all_videos();

  for (let i = 0; i < playlistVideos.length; i++) {
    const video = playlistVideos[i];
    songList.push(video.url);
  }
}

async function attachRecorder(): Promise<void> {
  player.play(
    createAudioResource(
      ytdl(songList[actualSong], {
        agent,
        filter: "audioonly",
        highWaterMark: 1 << 62,
        liveBuffer: 1 << 62,
        dlChunkSize: 0,
        quality: "lowestaudio",
      })
    )
  );
}

async function onChannelConnect(message: Message<boolean>): Promise<void> {
  const channel = message.member?.voice.channel;
  if (channel) {
    try {
      actualVoiceChannelId = channel.id;
      actualChannelId = message.channelId;
      actualConnection = await connectToChannel(channel);
      actualConnection.subscribe(player);
      await message.reply(channelConnectSuccess);
    } catch (error) {
      await message.reply(channelConnectFailed);
      console.error(error);
    }
  } else {
    actualChannelId = "";
    await message.reply(userNotInVoiceChannel);
  }
}

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

// State change from play-dl media player
player.on("stateChange", (oldState, newState) => {
  if (
    oldState.status === AudioPlayerStatus.Idle &&
    newState.status === AudioPlayerStatus.Playing
  ) {
    const channel: Channel | undefined =
      client.channels.cache.get(actualChannelId);
    if (channel && channel.type == ChannelType.GuildText) {
      channel.send(noMusic);
    }
  } else if (newState.status === AudioPlayerStatus.Idle) {
    if (!isLooping) {
      songList.shift();
    } else {
      actualSong >= songList.length - 1 ? (actualSong = 0) : actualSong++;
    }

    if (songList.length > 0) {
      attachRecorder();

      return;
    }

    const channel: Channel | undefined =
      client.channels.cache.get(actualChannelId);

    if (channel && channel.type == ChannelType.GuildText) {
      initialPlay = true;
      channel.send(noMusicLeft);
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

client.on(Events.ClientReady, () => {
  console.info("Client Ready");
});

client.on(Events.MessageCreate, async (message) => {
  if (!message.guildId) return;

  const userMessage: string = message.content.toLowerCase();

  if (userMessage === InputsEnum.CONNECT_CHANNEL) {
    await onChannelConnect(message);
  } else if (userMessage.startsWith(InputsEnum.ADD_URL)) {
    await addUrlToList(message);
  } else if (userMessage.includes(InputsEnum.LOOP)) {
    isLooping = true;
  } else if (userMessage.toLowerCase() === InputsEnum.XUPALO) {
    await message.reply(xupalo);
  } else if (userMessage.includes(InputsEnum.STOP)) {
    songList = [];
    isLooping = false;
    initialPlay = true;
    player.stop();
  }
});

void client.login(token);

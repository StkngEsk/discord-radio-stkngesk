import { Cookie } from "@distube/ytdl-core";

export interface IConfig {
  token: string;
  maxTransmissionGap: number;
  cookies: Cookie[];
}

import type Anthropic from "@anthropic-ai/sdk";
import type { proto } from "@whiskeysockets/baileys";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import OpenAI from "openai";
import { config } from "../../config.js";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

export const transcribeTools: Anthropic.Tool[] = [
  {
    name: "transcribe_audio",
    description: "Transcribe a WhatsApp voice note into text.",
    input_schema: {
      type: "object",
      properties: {
        audioId: { type: "string" },
      },
      required: ["audioId"],
    },
  },
];

export async function transcribeAudio(
  audioMessage: proto.IMessage["audioMessage"],
): Promise<string | undefined> {
  if (!audioMessage) return undefined;

  const buffer = await downloadMediaMessage(
    { message: { audioMessage } } as proto.IWebMessageInfo,
    "buffer",
    {},
  );

  const transcription = await openai.audio.transcriptions.create({
    file: new File([buffer as BlobPart], "audio.ogg"),
    model: "whisper-1",
  });

  return transcription.text;
}

import type { Command } from "./command.js";
import { sendCommand } from "./commands/send.js";
import { sendRawCommand } from "./commands/send-raw.js";
import { templatesListCommand } from "./commands/templates-list.js";
import { templatesGetCommand } from "./commands/templates-get.js";
import { messagesListCommand } from "./commands/messages-list.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const registry: Command<any, any>[] = [
  sendCommand,
  sendRawCommand,
  templatesListCommand,
  templatesGetCommand,
  messagesListCommand,
];

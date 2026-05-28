import type { Command } from "./command";
import { sendCommand } from "./commands/send";
import { sendRawCommand } from "./commands/send-raw";
import { templatesListCommand } from "./commands/templates-list";
import { templatesGetCommand } from "./commands/templates-get";
import { messagesListCommand } from "./commands/messages-list";
import { messagesGetCommand } from "./commands/messages-get";
import { messagesCancelCommand } from "./commands/messages-cancel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const registry: Command<any, any>[] = [
  sendCommand,
  sendRawCommand,
  templatesListCommand,
  templatesGetCommand,
  messagesListCommand,
  messagesGetCommand,
  messagesCancelCommand,
];

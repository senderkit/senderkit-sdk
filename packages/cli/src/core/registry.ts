import type { Command } from "./command";
import { sendCommand } from "./commands/send";
import { sendRawCommand } from "./commands/send-raw";
import { templatesListCommand } from "./commands/templates-list";
import { templatesGetCommand } from "./commands/templates-get";
import { messagesListCommand } from "./commands/messages-list";
import { messagesGetCommand } from "./commands/messages-get";
import { messagesCancelCommand } from "./commands/messages-cancel";
import { contextCommand } from "./commands/context";
import { inboundAddressesListCommand } from "./commands/inbound-addresses-list";
import { inboundAddressesCreateCommand } from "./commands/inbound-addresses-create";
import { inboundAddressesDeleteCommand } from "./commands/inbound-addresses-delete";
import { inboundMessagesListCommand } from "./commands/inbound-messages-list";
import { inboundMessagesGetCommand } from "./commands/inbound-messages-get";
import { inboundDomainsListCommand } from "./commands/inbound-domains-list";
import { inboundDomainsCreateCommand } from "./commands/inbound-domains-create";
import { inboundDomainsDeleteCommand } from "./commands/inbound-domains-delete";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const registry: Command<any, any>[] = [
  sendCommand,
  sendRawCommand,
  templatesListCommand,
  templatesGetCommand,
  messagesListCommand,
  messagesGetCommand,
  messagesCancelCommand,
  contextCommand,
  inboundAddressesListCommand,
  inboundAddressesCreateCommand,
  inboundAddressesDeleteCommand,
  inboundMessagesListCommand,
  inboundMessagesGetCommand,
  inboundDomainsListCommand,
  inboundDomainsCreateCommand,
  inboundDomainsDeleteCommand,
];

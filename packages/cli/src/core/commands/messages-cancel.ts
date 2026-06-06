import type { CancelMessageResponse } from "@senderkit/sdk";
import { cancelMessageInput, MCP_TOOLS_BY_NAME } from "@senderkit/sdk/mcp";
import { z } from "zod";
import { defineCommand, fromSpec } from "../command";
import { success, keyValues } from "../../cli/format";

const schema = z.object(cancelMessageInput);

export const messagesCancelCommand = defineCommand<
  typeof schema.shape,
  CancelMessageResponse
>({
  ...fromSpec(MCP_TOOLS_BY_NAME.senderkit_cancel_message),
  path: ["messages", "cancel"],
  schema,
  positional: ["id"],
  run: (input, { client }) => client.messages.cancel(input.id),
  format: (res) =>
    `${success(`Canceled ${res.id}`)}\n${keyValues({
      id: res.id,
      status: res.status,
    })}`,
});

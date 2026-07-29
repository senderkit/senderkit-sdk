import type { DeleteInboundAddressResponse } from "@senderkit/sdk";
import { inboundAddressesDeleteInput, MCP_TOOLS_BY_NAME } from "@senderkit/sdk/mcp";
import { z } from "zod";
import { defineCommand, fromSpec } from "../command";
import { success } from "../../cli/format";

const schema = z.object(inboundAddressesDeleteInput);

export const inboundAddressesDeleteCommand = defineCommand<
  typeof schema.shape,
  DeleteInboundAddressResponse
>({
  ...fromSpec(MCP_TOOLS_BY_NAME.senderkit_inbound_addresses_delete),
  path: ["inbound", "addresses", "delete"],
  schema,
  positional: ["id"],
  run: (input, { client }) => client.inbound.addresses.delete(input.id),
  format: () => success("Deleted inbound address"),
});

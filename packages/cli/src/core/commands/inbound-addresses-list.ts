import type { InboundAddress } from "@senderkit/sdk";
import { inboundAddressesListInput, MCP_TOOLS_BY_NAME } from "@senderkit/sdk/mcp";
import { z } from "zod";
import { defineCommand, fromSpec } from "../command";
import { table } from "../../cli/format";

const schema = z.object(inboundAddressesListInput);

export const inboundAddressesListCommand = defineCommand<
  typeof schema.shape,
  InboundAddress[]
>({
  ...fromSpec(MCP_TOOLS_BY_NAME.senderkit_inbound_addresses_list),
  path: ["inbound", "addresses", "list"],
  schema,
  run: (_input, { client }) => client.inbound.addresses.list(),
  format: (addresses) => {
    if (addresses.length === 0) return "No inbound addresses found.";
    return table(
      ["ID", "ADDRESS", "FORWARD TO", "ACTIVE", "CREATED"],
      addresses.map((a) => [
        a.id,
        a.address,
        a.forwardTo ?? "—",
        a.active ? "yes" : "no",
        String(a.createdAt),
      ]),
    );
  },
});

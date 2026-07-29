import type { InboundAddress } from "@senderkit/sdk";
import { inboundAddressesCreateInput, MCP_TOOLS_BY_NAME } from "@senderkit/sdk/mcp";
import { z } from "zod";
import { defineCommand, fromSpec } from "../command";
import { success, keyValues } from "../../cli/format";

const schema = z.object(inboundAddressesCreateInput);

export const inboundAddressesCreateCommand = defineCommand<
  typeof schema.shape,
  InboundAddress
>({
  ...fromSpec(MCP_TOOLS_BY_NAME.senderkit_inbound_addresses_create),
  path: ["inbound", "addresses", "create"],
  schema,
  positional: ["localPart"],
  run: (input, { client }) =>
    client.inbound.addresses.create({
      localPart: input.localPart,
      description: input.description,
      forwardTo: input.forwardTo,
      webhookEndpointId: input.webhookEndpointId,
    }),
  format: (a) =>
    `${success(`Created ${a.address}`)}\n${keyValues({
      id: a.id,
      address: a.address,
      description: a.description,
      forwardTo: a.forwardTo,
      active: a.active,
      livemode: a.livemode,
      createdAt: a.createdAt,
    })}`,
});

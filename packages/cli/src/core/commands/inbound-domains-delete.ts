import type { DeleteInboundDomainResponse } from "@senderkit/sdk";
import { inboundDomainsDeleteInput, MCP_TOOLS_BY_NAME } from "@senderkit/sdk/mcp";
import { z } from "zod";
import { defineCommand, fromSpec } from "../command";
import { success } from "../../cli/format";

const schema = z.object(inboundDomainsDeleteInput);

export const inboundDomainsDeleteCommand = defineCommand<
  typeof schema.shape,
  DeleteInboundDomainResponse
>({
  ...fromSpec(MCP_TOOLS_BY_NAME.senderkit_inbound_domains_delete),
  path: ["inbound", "domains", "delete"],
  schema,
  positional: ["id"],
  run: (input, { client }) => client.inbound.domains.delete(input.id),
  format: () => success("Deleted inbound domain"),
});

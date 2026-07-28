import type { InboundDomain } from "@senderkit/sdk";
import { inboundDomainsListInput, MCP_TOOLS_BY_NAME } from "@senderkit/sdk/mcp";
import { z } from "zod";
import { defineCommand, fromSpec } from "../command";
import { table } from "../../cli/format";

const schema = z.object(inboundDomainsListInput);

export const inboundDomainsListCommand = defineCommand<
  typeof schema.shape,
  InboundDomain[]
>({
  ...fromSpec(MCP_TOOLS_BY_NAME.senderkit_inbound_domains_list),
  path: ["inbound", "domains", "list"],
  schema,
  run: (_input, { client }) => client.inbound.domains.list(),
  format: (domains) => {
    if (domains.length === 0) return "No inbound domains found.";
    return table(
      ["ID", "DOMAIN", "KIND", "STATUS", "CREATED"],
      domains.map((d) => [d.id, d.domain, d.kind, d.status, String(d.createdAt)]),
    );
  },
});

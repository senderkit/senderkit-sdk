import type { InboundDomain } from "@senderkit/sdk";
import { inboundDomainsCreateInput, MCP_TOOLS_BY_NAME } from "@senderkit/sdk/mcp";
import { z } from "zod";
import { defineCommand, fromSpec } from "../command";
import { success, keyValues, table } from "../../cli/format";

const schema = z.object(inboundDomainsCreateInput);

export const inboundDomainsCreateCommand = defineCommand<
  typeof schema.shape,
  InboundDomain
>({
  ...fromSpec(MCP_TOOLS_BY_NAME.senderkit_inbound_domains_create),
  path: ["inbound", "domains", "create"],
  schema,
  positional: ["domain"],
  format: (d) => {
    const header = `${success(`Claimed ${d.domain}`)}\n${keyValues({
      id: d.id,
      domain: d.domain,
      kind: d.kind,
      status: d.status,
      createdAt: d.createdAt,
    })}`;
    if (d.records.length === 0) return header;
    const records = table(
      ["TYPE", "NAME", "VALUE", "PRIORITY", "PURPOSE"],
      d.records.map((r) => [
        r.type,
        r.name,
        r.value,
        r.priority != null ? String(r.priority) : "—",
        r.purpose,
      ]),
    );
    return `${header}\n\nPublish these DNS records, then verification completes automatically:\n${records}`;
  },
  run: (input, { client }) =>
    client.inbound.domains.create({
      domain: input.domain,
      acknowledgeExistingMx: input.acknowledgeExistingMx,
    }),
});

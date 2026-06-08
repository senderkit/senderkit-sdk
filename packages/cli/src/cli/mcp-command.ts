import { Command as Commander } from "commander";
import pc from "picocolors";
import { startMcpServer } from "../mcp/server";
import { startHttpServer } from "../mcp/http";
import {
  apiKeyRemoteSpec,
  CLIENT_IDS,
  type ClientId,
  DEFAULT_REMOTE_URL,
  install,
  isApiKeyAuth,
  oauthRemoteSpec,
  printSnippet,
  serverBlock,
} from "../mcp/install";
import { tryResolveApiKey } from "../core/context";
import { success } from "./format";
import { handleError } from "./errors";

const CLIENT_CHOICES = ["all", ...CLIENT_IDS];

export function registerMcp(program: Commander): void {
  const mcp = program
    .command("mcp")
    .description("Run or install the SenderKit MCP server.")
    .option("--http", "Serve over Streamable HTTP instead of stdio.")
    .option("--port <n>", "Port for --http mode.", "3000")
    .option("--path <path>", "Endpoint path for --http mode.", "/mcp")
    .action(async (opts: { http?: boolean; port: string; path: string }) => {
      try {
        if (opts.http) {
          const port = Number.parseInt(opts.port, 10);
          if (!Number.isInteger(port) || port < 0) {
            throw new Error(`Invalid --port "${opts.port}".`);
          }
          await startHttpServer({ port, path: opts.path });
        } else {
          // `senderkit mcp` with no flags starts the stdio server.
          await startMcpServer();
        }
      } catch (err) {
        handleError(err);
      }
    });

  mcp
    .command("install")
    .description("Configure the MCP server in a supported client.")
    .option(
      "--client <client>",
      `Target client (choices: ${CLIENT_CHOICES.join(", ")})`,
      "all",
    )
    .option("--print", "Print the config instead of writing files.")
    .option("--remote", `Point clients at a remote MCP endpoint (default ${DEFAULT_REMOTE_URL}).`)
    .option("--url <url>", "Remote MCP endpoint URL (implies --remote).")
    .option(
      "--api-key-auth",
      "For remote installs, write API-key (bearer) auth instead of OAuth (the default).",
    )
    .action(
      (opts: {
        client: string;
        print?: boolean;
        remote?: boolean;
        url?: string;
        apiKeyAuth?: boolean;
      }) => {
        try {
          if (!CLIENT_CHOICES.includes(opts.client)) {
            throw new Error(
              `Unknown client "${opts.client}". Choices: ${CLIENT_CHOICES.join(", ")}.`,
            );
          }

          const globals = program.optsWithGlobals() as { apiKey?: string };
          const apiKey = tryResolveApiKey({ apiKey: globals.apiKey });
          const block = serverBlock(apiKey);
          const url = opts.url ?? DEFAULT_REMOTE_URL;
          const useRemote = Boolean(opts.remote || opts.url);
          // Remote installs default to OAuth (no committed credential), matching
          // the senderkit-skills plugin manifests. --api-key-auth opts into bearer.
          const remote = useRemote
            ? opts.apiKeyAuth
              ? apiKeyRemoteSpec(apiKey, url)
              : oauthRemoteSpec(url)
            : undefined;

          const usingApiKey = remote ? isApiKeyAuth(remote) : !useRemote;

          if (opts.print) {
            if (opts.client === "all") {
              // No single schema applies to every client; show the common one.
              const value = remote
                ? isApiKeyAuth(remote)
                  ? { url: remote.url, headers: remote.headers }
                  : { url: remote.url }
                : block;
              process.stdout.write(
                `${JSON.stringify({ mcpServers: { senderkit: value } }, null, 2)}\n`,
              );
            } else {
              const snippet = printSnippet(opts.client as ClientId, block, remote);
              process.stdout.write(`${pc.dim(`# ${snippet.path}`)}\n${snippet.content}`);
            }
            return;
          }

          const results = install({ client: opts.client as ClientId | "all", apiKey, remote });
          if (results.length === 0) {
            process.stdout.write(
              "No supported MCP clients detected. Run with --client <name> --print to copy the config manually.\n",
            );
            return;
          }
          for (const r of results) {
            if (r.method === "claude-cli") {
              process.stdout.write(`${success(`Registered ${r.label} via \`claude mcp add\`.`)}\n`);
            } else {
              const verb = r.created ? "Created" : "Updated";
              process.stdout.write(`${success(`${verb} ${r.label}: ${r.path}`)}\n`);
            }
          }
          if (!usingApiKey) {
            // OAuth: no key written. Tell the user to complete sign-in in-client.
            process.stdout.write(
              pc.dim(
                "OAuth — no API key stored. Sign in from your client to authorize " +
                  "(e.g. Claude Code `/mcp`, Cursor → Settings → MCP, `codex mcp login senderkit`).\n",
              ),
            );
          } else if (!apiKey) {
            process.stdout.write(
              pc.yellow(
                "No API key configured — wrote a ${SENDERKIT_API_KEY} placeholder. " +
                  "Set the env var or run `senderkit login`.\n",
              ),
            );
          }
        } catch (err) {
          handleError(err);
        }
      },
    );
}

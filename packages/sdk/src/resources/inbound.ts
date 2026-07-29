import type { BinaryResponse, HttpClient } from "../http";
import type {
  CreateInboundAddressParams,
  CreateInboundDomainParams,
  DeleteInboundAddressResponse,
  DeleteInboundDomainResponse,
  InboundAddress,
  InboundDomain,
  InboundMessage,
  InboundMessageSummary,
  ListInboundMessagesParams,
} from "../types";

function toIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

/** Manage addresses on the workspace's shared receiving domain. */
export class InboundAddressesResource {
  constructor(private readonly http: HttpClient) {}

  /** List every inbound address on the workspace's shared domain, oldest first. */
  async list(): Promise<InboundAddress[]> {
    const res = await this.http.request<{ addresses: InboundAddress[] }>({
      method: "GET",
      path: "/v1/inbound/addresses",
    });
    return res.addresses;
  }

  /**
   * Provision a new address. The shared domain is created lazily on first call.
   * Omit `localPart` for an unguessable generated one.
   */
  async create(params: CreateInboundAddressParams = {}): Promise<InboundAddress> {
    const body: Record<string, unknown> = {};
    if (params.localPart !== undefined) body["localPart"] = params.localPart;
    if (params.description !== undefined) body["description"] = params.description;
    if (params.forwardTo !== undefined) body["forwardTo"] = params.forwardTo;
    if (params.webhookEndpointId !== undefined) {
      body["webhookEndpointId"] = params.webhookEndpointId;
    }
    if (params.domainId !== undefined) body["domainId"] = params.domainId;
    if (params.livemode !== undefined) body["livemode"] = params.livemode;
    return this.http.request<InboundAddress>({
      method: "POST",
      path: "/v1/inbound/addresses",
      body,
    });
  }

  /**
   * Soft-delete an address; mail sent to it afterward is dropped like any other
   * unmatched recipient.
   */
  async delete(id: string): Promise<DeleteInboundAddressResponse> {
    if (!id) throw new TypeError("inbound.addresses.delete(id): id is required");
    return this.http.request<DeleteInboundAddressResponse>({
      method: "DELETE",
      path: `/v1/inbound/addresses/${encodeURIComponent(id)}`,
    });
  }
}

/** Read mail received on the workspace's inbound addresses. */
export class InboundMessagesResource {
  constructor(private readonly http: HttpClient) {}

  /** List received-message summaries for the connection's environment, newest first. */
  async list(params: ListInboundMessagesParams = {}): Promise<InboundMessageSummary[]> {
    const res = await this.http.request<{ messages: InboundMessageSummary[] }>({
      method: "GET",
      path: "/v1/inbound/messages",
      query: {
        limit: params.limit,
        before: params.before ? toIsoString(params.before) : undefined,
        address: params.address,
      },
    });
    return res.messages;
  }

  /** Retrieve a single received message, including parsed body, headers, and verdicts. */
  async get(id: string): Promise<InboundMessage> {
    if (!id) throw new TypeError("inbound.messages.get(id): id is required");
    return this.http.request<InboundMessage>({
      method: "GET",
      path: `/v1/inbound/messages/${encodeURIComponent(id)}`,
    });
  }

  /**
   * Fetch the raw RFC 822 source (`message/rfc822`). The object expires 30 days
   * after receipt; after that this rejects with a `SenderKitApiError` (`410`).
   */
  async raw(id: string): Promise<BinaryResponse> {
    if (!id) throw new TypeError("inbound.messages.raw(id): id is required");
    return this.http.requestBinary({
      method: "GET",
      path: `/v1/inbound/messages/${encodeURIComponent(id)}/raw`,
      accept: "message/rfc822",
    });
  }

  /**
   * Fetch one attachment's bytes by its zero-based `index` (matching
   * `attachments[].index` on the message). Subject to the same 30-day retention
   * as the raw message.
   */
  async attachment(id: string, index: number): Promise<BinaryResponse> {
    if (!id) throw new TypeError("inbound.messages.attachment(id, index): id is required");
    if (!Number.isInteger(index) || index < 0) {
      throw new TypeError("inbound.messages.attachment(id, index): index must be a non-negative integer");
    }
    return this.http.requestBinary({
      method: "GET",
      path: `/v1/inbound/messages/${encodeURIComponent(id)}/attachments/${index}`,
      accept: "application/octet-stream",
    });
  }
}

/** Manage custom inbound domains — claim a domain and read its verification state. */
export class InboundDomainsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List the workspace's inbound domains, including the shared
   * `{slug}.in.senderkit.email` domain when in use.
   */
  async list(): Promise<InboundDomain[]> {
    const res = await this.http.request<{ domains: InboundDomain[] }>({
      method: "GET",
      path: "/v1/inbound/domains",
    });
    return res.domains;
  }

  /**
   * Claim a custom domain for receiving. The result carries the DNS `records`
   * the user must publish; nothing is received until they are live and the
   * verification sweep flips the domain to `verified`.
   *
   * If the domain already has live MX records pointing elsewhere, this rejects
   * with a `SenderKitApiError` (`409`, `code: "existing_mx"`) whose `details`
   * name the current mail host(s) — get the user's explicit confirmation, then
   * retry with `acknowledgeExistingMx: true`.
   */
  async create(params: CreateInboundDomainParams): Promise<InboundDomain> {
    if (!params?.domain) {
      throw new TypeError("inbound.domains.create(params): domain is required");
    }
    const body: Record<string, unknown> = { domain: params.domain };
    if (params.acknowledgeExistingMx !== undefined) {
      body["acknowledgeExistingMx"] = params.acknowledgeExistingMx;
    }
    return this.http.request<InboundDomain>({
      method: "POST",
      path: "/v1/inbound/domains",
      body,
    });
  }

  /**
   * Delete a custom inbound domain by id; its addresses stop receiving mail
   * immediately. The shared domain cannot be deleted (`409`).
   */
  async delete(id: string): Promise<DeleteInboundDomainResponse> {
    if (!id) throw new TypeError("inbound.domains.delete(id): id is required");
    return this.http.request<DeleteInboundDomainResponse>({
      method: "DELETE",
      path: `/v1/inbound/domains/${encodeURIComponent(id)}`,
    });
  }
}

/**
 * The `inbound` namespace: `addresses` (provisioning), `messages` (received
 * mail), and `domains` (custom receiving domains).
 */
export class InboundResource {
  readonly addresses: InboundAddressesResource;
  readonly messages: InboundMessagesResource;
  readonly domains: InboundDomainsResource;

  constructor(http: HttpClient) {
    this.addresses = new InboundAddressesResource(http);
    this.messages = new InboundMessagesResource(http);
    this.domains = new InboundDomainsResource(http);
  }
}

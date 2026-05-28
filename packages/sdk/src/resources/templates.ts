import type { HttpClient } from "../http";
import type { Template } from "../types";

export class TemplatesResource {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<Template[]> {
    const res = await this.http.request<{ data: Template[] } | Template[]>({
      method: "GET",
      path: "/v1/templates",
    });
    return Array.isArray(res) ? res : res.data;
  }

  async get(slug: string): Promise<Template> {
    if (!slug) throw new TypeError("templates.get(slug): slug is required");
    return this.http.request<Template>({
      method: "GET",
      path: `/v1/templates/${encodeURIComponent(slug)}`,
    });
  }
}

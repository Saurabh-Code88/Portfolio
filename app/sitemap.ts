import type { MetadataRoute } from "next";
import { projects } from "@/content/projects";
import { siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPages = ["", "/projects", ...projects.map(({ slug }) => `/projects/${slug}`)];
  return publicPages.map((path) => ({ url: new URL(path, siteUrl).toString() }));
}

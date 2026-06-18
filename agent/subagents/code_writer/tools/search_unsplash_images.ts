import { defineTool } from "eve/tools";
import { z } from "zod";

const UnsplashSearchParamsSchema = z.object({
  query: z.string().trim().min(1),
  count: z.number().int().min(1).max(30).default(6),
});

type UnsplashApiPhoto = {
  readonly alt_description?: string | null;
  readonly description?: string | null;
  readonly id: string;
  readonly links?: {
    readonly download_location?: string;
  };
  readonly urls?: {
    readonly regular?: string;
    readonly thumb?: string;
  };
  readonly user?: {
    readonly links?: {
      readonly html?: string;
    };
    readonly name?: string;
  };
};

type UnsplashSearchResponse = {
  readonly results?: UnsplashApiPhoto[];
};

export default defineTool({
  description:
    "Search Unsplash for high-quality landscape imagery when user-provided assets are insufficient for a generated website.",
  inputSchema: UnsplashSearchParamsSchema,
  async execute({ query, count }) {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    const apiBaseUrl =
      process.env.UNSPLASH_API_BASE_URL ?? "https://api.unsplash.com";

    if (!accessKey) {
      return {
        configured: false,
        query,
        photos: [],
        message: "UNSPLASH_ACCESS_KEY is not configured.",
      };
    }

    const url = new URL("/search/photos", apiBaseUrl);
    url.search = new URLSearchParams({
      query,
      per_page: String(count),
      orientation: "landscape",
      content_filter: "high",
    }).toString();

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
        signal: AbortSignal.timeout(8_000),
      });

      if (!response.ok) {
        return {
          configured: true,
          query,
          photos: [],
          message: `Unsplash returned ${response.status}.`,
        };
      }

      const data = (await response.json()) as UnsplashSearchResponse;
      const photos = (data.results ?? [])
        .map((photo) => {
          const url = photo.urls?.regular;

          if (!url) {
            return null;
          }

          const alt =
            photo.alt_description ?? photo.description ?? query;

          return {
            id: photo.id,
            url,
            thumbUrl: photo.urls?.thumb ?? "",
            alt,
            description: photo.description ?? alt,
            photographerName: photo.user?.name,
            photographerUrl: photo.user?.links?.html,
            downloadLocation: photo.links?.download_location,
          };
        })
        .filter((photo): photo is NonNullable<typeof photo> => Boolean(photo));

      return {
        configured: true,
        query,
        photos,
        message: `Found ${photos.length} photo(s).`,
      };
    } catch (error) {
      return {
        configured: true,
        query,
        photos: [],
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

import { useQuery } from "@tanstack/react-query";
import { categoryApi, homepageApi, newsApi } from "@/lib/endpoints";

/** Taxonomy and homepage rarely change; cache them long so navigation is instant. */
export const useCategoryTree = () =>
  useQuery({ queryKey: ["categories", "tree"], queryFn: () => categoryApi.tree(), staleTime: 10 * 60_000 });

export const useHomeFeed = () =>
  useQuery({ queryKey: ["homefeed"], queryFn: newsApi.homeFeed, staleTime: 2 * 60_000 });

export const useHomepage = () =>
  useQuery({ queryKey: ["homepage"], queryFn: homepageApi.get, staleTime: 2 * 60_000 });

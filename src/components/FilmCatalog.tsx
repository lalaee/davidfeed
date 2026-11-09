"use client";

import { createContext, useContext } from "react";

import { FALLBACK_CATALOG, type FilmCatalog } from "@/lib/filmCatalog";

/*
 * The film list, from the root layout to the pages that show films — Home's
 * verse of the day, You › Saved and a saved film's own feed. Loaded once on the
 * server per five minutes (lib/filmCatalog.ts) and passed down rather than
 * fetched again in the browser, so every page agrees on what is published.
 */
const FilmCatalogContext = createContext<FilmCatalog>(FALLBACK_CATALOG);

export function FilmCatalogProvider({
  catalog,
  children,
}: {
  catalog: FilmCatalog;
  children: React.ReactNode;
}) {
  return <FilmCatalogContext.Provider value={catalog}>{children}</FilmCatalogContext.Provider>;
}

export function useFilmCatalog(): FilmCatalog {
  return useContext(FilmCatalogContext);
}

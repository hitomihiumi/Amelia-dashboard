export interface OpenIncident {
  id: string;
  title: string;
  severity: string;
  auto: boolean;
  startedAt: Date;
}

export interface DraftPost {
  id: string;
  title: string;
  category: string;
  updatedAt: Date;
}

export interface PublishedPost {
  id: string;
  slug: string;
  title: string;
  category: string;
  publishedAt: Date | null;
}

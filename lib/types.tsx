export interface PostMetadata {
  title: string;
  date: Date;
  tags: string[];
  published: boolean;
  description?: string;
}

export interface PostMetadataWithSlug extends PostMetadata {
  slug: string;
}

export interface Post {
  slug: string;
  metadata: PostMetadata;
  content: string;
}

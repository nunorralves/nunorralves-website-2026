import { getAllPostsMetadataWithSlug } from "lib/helpers";

export default async function sitemap() {
  const baseUrl = "https://nunorralves.pt";
  const posts = await getAllPostsMetadataWithSlug();

  const pages = [
    { url: `${baseUrl}/`, lastModified: new Date().toISOString() },
    { url: `${baseUrl}/archive`, lastModified: new Date().toISOString() },
    { url: `${baseUrl}/search`, lastModified: new Date().toISOString() },
    { url: `${baseUrl}/tags`, lastModified: new Date().toISOString() },
  ];

  const postPages = posts.map((post) => ({
    url: `${baseUrl}/posts/${post.slug}`,
    lastModified: new Date(post.date).toISOString(),
  }));

  return [...pages, ...postPages];
}

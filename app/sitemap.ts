import {
  getAllPostsMetadataWithSlug,
  getAllProjectsMetadataWithSlug,
} from "lib/helpers";

export default async function sitemap() {
  const baseUrl = "https://nunorralves.pt";
  const [posts, projects] = await Promise.all([
    getAllPostsMetadataWithSlug(),
    getAllProjectsMetadataWithSlug(),
  ]);

  const pages = [
    { url: `${baseUrl}/`, lastModified: new Date().toISOString() },
    { url: `${baseUrl}/blog`, lastModified: new Date().toISOString() },
    { url: `${baseUrl}/projects`, lastModified: new Date().toISOString() },
    { url: `${baseUrl}/search`, lastModified: new Date().toISOString() },
  ];

  const postPages = posts.map((post) => ({
    url: `${baseUrl}/posts/${post.slug}`,
    lastModified: new Date(post.date).toISOString(),
  }));

  // Only projects with a body have a page of their own
  const projectPages = projects
    .filter((project) => project.hasBody)
    .map((project) => ({
      url: `${baseUrl}/projects/${project.slug}`,
      lastModified: new Date(project.date).toISOString(),
    }));

  return [...pages, ...postPages, ...projectPages];
}

import React from "react";
import { getAllPosts, toNewsDTO } from "@/lib/news/news";
import { NewsList } from "@/components/admin/news/NewsList";
import { deleteNewsPost, setNewsPublished } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminNewsPage() {
  const posts = (await getAllPosts()).map(toNewsDTO);

  return (
    <NewsList
      posts={posts}
      actions={{ setPublished: setNewsPublished, remove: deleteNewsPost }}
    />
  );
}

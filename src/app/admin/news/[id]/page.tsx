import React from "react";
import { notFound } from "next/navigation";
import { getPostById, toNewsDTO } from "@/lib/news/news";
import { NewsEditor } from "@/components/admin/news/NewsEditor";
import { deleteNewsPost, saveNewsPost, setNewsPublished } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditNewsPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPostById(id);

  if (!post) notFound();

  return (
    <NewsEditor
      // A fresh editor per post, so state never leaks between two edit pages.
      key={post.id}
      post={toNewsDTO(post)}
      actions={{ save: saveNewsPost, setPublished: setNewsPublished, remove: deleteNewsPost }}
    />
  );
}

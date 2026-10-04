import React from "react";
import { NewsEditor } from "@/components/admin/news/NewsEditor";
import { deleteNewsPost, saveNewsPost, setNewsPublished } from "../actions";

export const dynamic = "force-dynamic";

export default function NewNewsPostPage() {
  return (
    <NewsEditor
      post={null}
      actions={{ save: saveNewsPost, setPublished: setNewsPublished, remove: deleteNewsPost }}
    />
  );
}

import React, { type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Heading, InlineCode, Line, SmartLink, Text } from "@once-ui-system/core";
import { CodeBlock } from "@once-ui-system/core/code";
import styles from "./Markdown.module.scss";

/** Plain text of a React subtree, used to build heading anchors. */
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

function anchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/&/g, "-and-")
    .replace(/[^\p{L}\p{N}_-]+/gu, "")
    .replace(/--+/g, "-");
}

function heading(as: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"): Components["h1"] {
  const variants = {
    h1: "heading-strong-xl",
    h2: "heading-strong-l",
    h3: "heading-strong-m",
    h4: "heading-strong-s",
    h5: "heading-strong-xs",
    h6: "heading-strong-xs",
  } as const;

  const Component: Components["h1"] = ({ children }) => (
    <Heading as={as} id={anchor(textOf(children))} variant={variants[as]} marginTop="24" marginBottom="12">
      {children}
    </Heading>
  );
  Component.displayName = `Markdown.${as}`;
  return Component;
}

const components: Components = {
  h1: heading("h1"),
  h2: heading("h2"),
  h3: heading("h3"),
  h4: heading("h4"),
  h5: heading("h5"),
  h6: heading("h6"),
  p: ({ children }) => (
    <Text
      as="p"
      variant="body-default-m"
      onBackground="neutral-medium"
      marginTop="8"
      marginBottom="12"
      style={{ lineHeight: "175%" }}
    >
      {children}
    </Text>
  ),
  a: ({ href, children }) => {
    const external = Boolean(href && /^https?:\/\//i.test(href));
    return (
      <SmartLink
        href={href ?? "#"}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </SmartLink>
    );
  },
  strong: ({ children }) => <strong className={styles.strong}>{children}</strong>,
  // Native lists: Once UI's List/ListItem draw no markers, so bullets and numbers would vanish.
  ul: ({ children }) => (
    <ul className={`${styles.list} ${styles.bullets} font-body font-default font-m`}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className={`${styles.list} ${styles.numbers} font-body font-default font-m`}>{children}</ol>
  ),
  li: ({ children }) => <li className={styles.item}>{children}</li>,
  blockquote: ({ children }) => <blockquote className={styles.quote}>{children}</blockquote>,
  hr: () => <Line />,
  // Any host is allowed here, which `next/image` would reject without a configured pattern.
  // eslint-disable-next-line @next/next/no-img-element
  img: ({ src, alt }) => <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" className={styles.image} />,
  table: ({ children }) => (
    <div className={styles.tableWrap}>
      <table className={`${styles.table} font-body font-default font-s`}>{children}</table>
    </div>
  ),
  code: ({ className, children }) => {
    const text = String(children ?? "").replace(/\n$/, "");
    const language = /language-([\w-]+)/.exec(className ?? "")?.[1];

    // Fenced blocks arrive with a language class or a newline; everything else is inline.
    if (language || text.includes("\n")) {
      return (
        <CodeBlock
          marginTop="8"
          marginBottom="16"
          codes={[{ code: text, language: language ?? "text", label: language ?? "text" }]}
          copyButton
        />
      );
    }

    return <InlineCode>{children}</InlineCode>;
  },
  // CodeBlock draws its own frame.
  pre: ({ children }) => <>{children}</>,
};

/**
 * Renders a Markdown document with the site's typography. Raw HTML is never rendered,
 * so editors cannot inject markup or scripts; GitHub flavoured tables, task lists and
 * strikethrough work. Shared by the public news page and the admin editor preview.
 */
export function Markdown({ source }: { source: string }) {
  return (
    <div className={styles.root}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}

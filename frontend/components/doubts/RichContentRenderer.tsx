"use client";

import React, { useState } from "react";
import { CodeIcon, CopyIcon, CheckIcon, AtSignIcon } from "@/components/ui/Icons";
import styles from "./richContent.module.css";

interface RichContentRendererProps {
  content: string;
  className?: string;
}

export function CodeBlockCard({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const [copied, setCopied] = useState(false);

  const cleanLang = (language || "CODE").trim().toUpperCase();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy code snippet", e);
    }
  }

  const lines = code.split("\n");

  return (
    <div className={styles.codeCard}>
      <div className={styles.codeHeader}>
        <div className={styles.codeLang}>
          <CodeIcon size={14} />
          <span>{cleanLang}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <CheckIcon size={13} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <CopyIcon size={13} />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>

      <div className={styles.codeBody}>
        <div className={styles.lineNumbers} aria-hidden="true">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre className={styles.codeContent}>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

/**
 * Parses inline code chips and @Student mentions
 */
function renderInlineElements(text: string): React.ReactNode[] {
  // Pattern matches:
  // 1. Inline code: `someCode`
  // 2. Mentions: @FirstName LastName or @Username (e.g. @Ishan Gupta or @Aditya)
  const regex = /(`[^`]+`)|(@[A-Za-z0-9_]+(?:\s[A-Za-z0-9_]+)?)/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchedText = match[0];
    const matchIndex = match.index;

    // Text before match
    if (matchIndex > lastIndex) {
      nodes.push(text.slice(lastIndex, matchIndex));
    }

    if (matchedText.startsWith("`") && matchedText.endsWith("`")) {
      // Inline code
      const codeSnippet = matchedText.slice(1, -1);
      nodes.push(
        <code key={`code-${matchIndex}`} className={styles.inlineCode}>
          {codeSnippet}
        </code>
      );
    } else if (matchedText.startsWith("@")) {
      // Student mention
      const mentionName = matchedText.slice(1);
      nodes.push(
        <span
          key={`mention-${matchIndex}`}
          className={styles.mentionBadge}
          title={`Classmate Mention: ${mentionName}`}
        >
          <AtSignIcon size={11} />
          <span>{mentionName}</span>
        </span>
      );
    }

    lastIndex = matchIndex + matchedText.length;
  }

  // Trailing text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

export function RichContentRenderer({
  content,
  className = "",
}: RichContentRendererProps) {
  if (!content) return null;

  // Split by fenced code blocks: ```lang\ncode\n```
  const codeBlockRegex = /```([a-zA-Z0-9_\-+]*)\s*([\s\S]*?)```/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const matchIndex = match.index;
    const fullMatch = match[0];
    const lang = match[1] || "code";
    const code = match[2]?.replace(/^\n+|\n+$/g, "") || "";

    // Text prior to the code block
    if (matchIndex > lastIndex) {
      const textSection = content.slice(lastIndex, matchIndex);
      const paragraphs = textSection.split(/\n{2,}/);

      paragraphs.forEach((p, pIdx) => {
        const trimmed = p.trim();
        if (trimmed) {
          const lines = trimmed.split("\n");
          parts.push(
            <p key={`p-${lastIndex}-${pIdx}`} className={styles.paragraph}>
              {lines.map((line, lIdx) => (
                <React.Fragment key={lIdx}>
                  {renderInlineElements(line)}
                  {lIdx < lines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          );
        }
      });
    }

    // Code block
    parts.push(
      <CodeBlockCard
        key={`code-block-${matchIndex}`}
        code={code}
        language={lang}
      />
    );

    lastIndex = matchIndex + fullMatch.length;
  }

  // Remaining text
  if (lastIndex < content.length) {
    const trailingText = content.slice(lastIndex);
    const paragraphs = trailingText.split(/\n{2,}/);

    paragraphs.forEach((p, pIdx) => {
      const trimmed = p.trim();
      if (trimmed) {
        const lines = trimmed.split("\n");
        parts.push(
          <p key={`p-trail-${pIdx}`} className={styles.paragraph}>
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {renderInlineElements(line)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      }
    });
  }

  return (
    <div className={`${styles.contentWrapper} ${className}`}>
      {parts.length > 0 ? parts : content}
    </div>
  );
}

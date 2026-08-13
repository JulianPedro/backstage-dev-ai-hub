const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n)*/;

/**
 * Drop a leading YAML frontmatter block (`---\n...\n---`) before a body is
 * rendered as markdown. CommonMark has no concept of frontmatter: the two
 * unblanked lines merge into one paragraph, and the closing `---` is then
 * read as a Setext-heading underline for it, rendering "name: x description:
 * y" as a heading. Display-only — Copy/Download/Install keep the body
 * verbatim (CONTEXT.md: body).
 */
export function stripFrontmatter(content: string): string {
  return content.replace(FRONTMATTER, '');
}

import { stripFrontmatter } from './stripFrontmatter';

describe('stripFrontmatter', () => {
  it('drops a leading YAML frontmatter block', () => {
    const content = [
      '---',
      'name: approved-github-workflows',
      'description: "Ensures workflows are reviewed."',
      '---',
      '',
      '# Approved GitHub Workflows',
      '',
      'Body text.',
    ].join('\n');

    expect(stripFrontmatter(content)).toBe(
      '# Approved GitHub Workflows\n\nBody text.',
    );
  });

  it('leaves content without frontmatter untouched', () => {
    const content = '# No Frontmatter\n\nJust a body.';
    expect(stripFrontmatter(content)).toBe(content);
  });

  it('leaves content with an unterminated fence untouched', () => {
    const content = '---\nname: x\n\n# Heading with no closing fence';
    expect(stripFrontmatter(content)).toBe(content);
  });

  it('does not touch a mid-document horizontal rule', () => {
    const content = '# Heading\n\nabove\n\n---\n\nbelow';
    expect(stripFrontmatter(content)).toBe(content);
  });

  it('handles CRLF line endings', () => {
    const content = '---\r\nname: x\r\n---\r\n\r\n# Heading';
    expect(stripFrontmatter(content)).toBe('# Heading');
  });
});

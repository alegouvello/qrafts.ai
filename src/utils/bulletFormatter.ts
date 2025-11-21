/**
 * Converts plain text with bullet points (including nested) to HTML
 * Handles both • character bullets and indented sub-bullets
 */
export function convertBulletsToHTML(text: string): string {
  if (!text || text.includes('<')) {
    return text; // Already HTML or empty
  }

  // Split by lines and • character
  const lines = text.split('\n').flatMap(line => {
    if (line.includes('•')) {
      return line.split('•').map(s => s.trim()).filter(s => s.length > 0).map(s => '• ' + s);
    }
    return [line.trim()].filter(s => s.length > 0);
  });

  if (lines.length === 0) return text;

  // Check if we have bullets
  const bulletLines = lines.filter(line => line.startsWith('•'));
  if (bulletLines.length === 0) {
    // No bullets, just wrap in paragraph
    return `<p>${text}</p>`;
  }

  // Parse bullet structure with indentation
  interface BulletItem {
    text: string;
    level: number;
    children: BulletItem[];
  }

  const parseBullets = (): BulletItem[] => {
    const root: BulletItem[] = [];
    const stack: BulletItem[] = [];

    for (const line of lines) {
      if (!line.startsWith('•')) continue;

      // Detect indentation level by counting leading spaces before •
      const match = line.match(/^(\s*)•\s*(.+)$/);
      if (!match) continue;

      const spaces = match[1].length;
      const text = match[2];
      const level = Math.floor(spaces / 2); // Every 2 spaces = 1 indent level

      const item: BulletItem = { text, level, children: [] };

      // Pop stack until we find the right parent level
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length === 0) {
        // Top level item
        root.push(item);
      } else {
        // Child item
        stack[stack.length - 1].children.push(item);
      }

      stack.push(item);
    }

    return root;
  };

  const renderBullets = (items: BulletItem[]): string => {
    if (items.length === 0) return '';

    let html = '<ul>';
    for (const item of items) {
      html += '<li>';
      html += item.text;
      if (item.children.length > 0) {
        html += renderBullets(item.children);
      }
      html += '</li>';
    }
    html += '</ul>';
    return html;
  };

  const bulletTree = parseBullets();
  return renderBullets(bulletTree);
}

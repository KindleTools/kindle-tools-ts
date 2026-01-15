/**
 * CSS styles for the HTML export.
 *
 * @packageDocumentation
 */

/**
 * Get the full CSS string for the HTML export.
 *
 * @param customCss - Optional custom CSS to append
 * @returns Complete CSS string
 */
export function getHtmlStyles(customCss?: string): string {
  return `
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f8f9fa;
      --bg-tertiary: #e9ecef;
      --text-primary: #212529;
      --text-secondary: #6c757d;
      --accent: #4361ee;
      --border: #dee2e6;
      --shadow: rgba(0, 0, 0, 0.1);
      --quote-bg: #f8f9fa;
      --quote-border: #4361ee;
    }

    .dark {
      --bg-primary: #1a1a2e;
      --bg-secondary: #16213e;
      --bg-tertiary: #0f3460;
      --text-primary: #eaeaea;
      --text-secondary: #a0a0a0;
      --accent: #4cc9f0;
      --border: #2a2a4a;
      --shadow: rgba(0, 0, 0, 0.3);
      --quote-bg: #16213e;
      --quote-border: #4cc9f0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
    }

    .header {
      background: var(--bg-secondary);
      padding: 2rem;
      text-align: center;
      border-bottom: 1px solid var(--border);
      position: relative;
    }

    .header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .stats {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .theme-toggle {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.5rem 1rem;
      cursor: pointer;
      font-size: 1.2rem;
      transition: all 0.2s;
    }

    .theme-toggle:hover {
      background: var(--accent);
      color: white;
    }

    .search-container {
      max-width: 800px;
      margin: 1.5rem auto;
      padding: 0 1rem;
      position: relative;
    }

    .search-input {
      width: 100%;
      padding: 1rem 1.5rem;
      font-size: 1rem;
      border: 2px solid var(--border);
      border-radius: 12px;
      background: var(--bg-primary);
      color: var(--text-primary);
      transition: all 0.2s;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.2);
    }

    .search-count {
      position: absolute;
      right: 1.5rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 1rem;
    }

    .book {
      background: var(--bg-secondary);
      border-radius: 16px;
      margin-bottom: 2rem;
      overflow: hidden;
      box-shadow: 0 4px 6px var(--shadow);
    }

    .book-header {
      background: var(--bg-tertiary);
      padding: 1.5rem;
      border-bottom: 1px solid var(--border);
    }

    .book-title {
      font-size: 1.4rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .book-author {
      color: var(--text-secondary);
      font-style: italic;
      margin-bottom: 0.5rem;
    }

    .book-count {
      display: inline-block;
      background: var(--accent);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .clippings {
      padding: 1rem;
    }

    .clipping {
      padding: 1rem;
      margin-bottom: 1rem;
      border-radius: 8px;
      background: var(--bg-primary);
      border-left: 4px solid var(--quote-border);
    }

    .clipping:last-child {
      margin-bottom: 0;
    }

    .clipping-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }

    .clipping-type {
      font-size: 1.1rem;
    }

    .clipping-content {
      font-size: 1rem;
      line-height: 1.7;
    }

    blockquote.clipping-content {
      border-left: none;
      padding: 0;
      margin: 0;
      font-style: italic;
    }

    .clipping-note {
      margin-top: 1rem;
      padding: 0.75rem;
      background: var(--bg-tertiary);
      border-radius: 6px;
      font-size: 0.9rem;
    }

    .clipping-highlight {
      border-left-color: #4361ee;
    }

    .clipping-note-type {
      border-left-color: #f72585;
    }

    .clipping-bookmark {
      border-left-color: #4cc9f0;
    }

    .footer {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
      font-size: 0.85rem;
      border-top: 1px solid var(--border);
    }

    .footer a {
      color: var(--accent);
      text-decoration: none;
    }

    .footer a:hover {
      text-decoration: underline;
    }

    .hidden {
      display: none !important;
    }

    @media print {
      .theme-toggle,
      .search-container {
        display: none;
      }

      .book {
        break-inside: avoid;
        box-shadow: none;
        border: 1px solid #ddd;
      }
    }

    @media (max-width: 600px) {
      .header h1 {
        font-size: 1.5rem;
      }

      .book-title {
        font-size: 1.2rem;
      }

      .clipping-meta {
        flex-direction: column;
        gap: 0.25rem;
      }
    }

    ${customCss ?? ""}`;
}

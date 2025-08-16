import * as cheerio from 'cheerio';

export interface StaticAnalysisResult {
  issues: Array<{
    selector: string;
    ruleId: string;
    wcag: string[];
    severity: string;
    message: string;
    source: 'static-analysis';
  }>;
  meta: {
    title: string | null;
    description: string | null;
    language: string | null;
    viewport: string | null;
    hasSkipLink: boolean;
    headingCount: { [key: string]: number };
    formCount: number;
    imageCount: number;
    linkCount: number;
  };
}

export function analyzeStaticHTML(html: string, url: string): StaticAnalysisResult {
  const $ = cheerio.load(html);
  const issues: StaticAnalysisResult['issues'] = [];
  
  // Meta information collection
  const title = $('title').text().trim() || null;
  const description = $('meta[name="description"]').attr('content') || null;
  const language = $('html').attr('lang') || null;
  const viewport = $('meta[name="viewport"]').attr('content') || null;
  
  // Count elements
  const headingCount: { [key: string]: number } = {};
  for (let i = 1; i <= 6; i++) {
    headingCount[`h${i}`] = $(`h${i}`).length;
  }
  const formCount = $('form').length;
  const imageCount = $('img').length;
  const linkCount = $('a[href]').length;

  // Check for skip link
  let hasSkipLink = false;
  $('a[href^="#"]').each((_, element) => {
    const text = $(element).text().toLowerCase();
    if (text.includes('skip') || text.includes('jump')) {
      hasSkipLink = true;
      return false; // break the loop
    }
  });

  // 1. Missing title
  if (!title) {
    issues.push({
      selector: 'title',
      ruleId: 'document-title',
      wcag: ['wcag2a', '2.4.2'],
      severity: 'critical',
      message: 'Document should have a title element',
      source: 'static-analysis'
    });
  }

  // 2. Missing language attribute
  if (!language) {
    issues.push({
      selector: 'html',
      ruleId: 'html-has-lang',
      wcag: ['wcag2a', '3.1.1'],
      severity: 'critical',
      message: 'HTML element should have a lang attribute',
      source: 'static-analysis'
    });
  }

  // 3. Missing viewport meta tag
  if (!viewport) {
    issues.push({
      selector: 'meta[name="viewport"]',
      ruleId: 'meta-viewport',
      wcag: ['wcag2a', '1.4.4'],
      severity: 'moderate',
      message: 'Missing viewport meta tag for responsive design',
      source: 'static-analysis'
    });
  } else if (viewport.includes('user-scalable=no')) {
    issues.push({
      selector: 'meta[name="viewport"]',
      ruleId: 'meta-viewport-scale',
      wcag: ['wcag2a', '1.4.4'],
      severity: 'critical',
      message: 'Viewport meta tag should not disable user scaling',
      source: 'static-analysis'
    });
  }

  // 4. Missing skip link
  if (!hasSkipLink) {
    issues.push({
      selector: 'body',
      ruleId: 'skip-link',
      wcag: ['wcag2a', '2.4.1'],
      severity: 'moderate',
      message: 'Page should have a skip link for keyboard users',
      source: 'static-analysis'
    });
  }

  // 5. Images without alt text
  $('img').each((_, element) => {
    const $img = $(element);
    const alt = $img.attr('alt');
    const role = $img.attr('role');
    const ariaHidden = $img.attr('aria-hidden');
    
    // Skip decorative images
    if (role === 'presentation' || role === 'none' || ariaHidden === 'true') {
      return;
    }
    
    if (alt === undefined) {
      issues.push({
        selector: $img.toString(),
        ruleId: 'image-alt',
        wcag: ['wcag2a', '1.1.1'],
        severity: 'critical',
        message: 'Image missing alt attribute',
        source: 'static-analysis'
      });
    }
  });

  // 6. Form fields without labels
  $('input, select, textarea').each((_, element) => {
    const $field = $(element);
    const id = $field.attr('id');
    const ariaLabel = $field.attr('aria-label');
    const ariaLabelledby = $field.attr('aria-labelledby');
    const title = $field.attr('title');
    const placeholder = $field.attr('placeholder');
    const type = $field.attr('type');
    
    // Check if field has a label
    let hasLabel = false;
    
    if (id && $(`label[for="${id}"]`).length > 0) {
      hasLabel = true;
    } else if (ariaLabel || ariaLabelledby || title) {
      hasLabel = true;
    } else if (type === 'text' || type === 'email' || type === 'password' || 
               type === 'search' || type === 'tel' || type === 'url') {
      if (placeholder) {
        hasLabel = true;
      }
    }
    
    if (!hasLabel) {
      issues.push({
        selector: $field.toString(),
        ruleId: 'form-field-labels',
        wcag: ['wcag2a', '1.3.1'],
        severity: 'critical',
        message: 'Form field missing accessible label',
        source: 'static-analysis'
      });
    }
  });

  // 7. Vague link text
  $('a[href]').each((_, element) => {
    const $link = $(element);
    const text = $link.text().trim().toLowerCase();
    const vagueTexts = [
      'click here', 'read more', 'more', 'learn more', 'here', 
      'this', 'that', 'link', 'click', 'go', 'continue', 'next',
      'previous', 'back', 'forward', 'submit', 'send', 'ok', 'yes', 'no'
    ];
    
    if (vagueTexts.some(vague => text.includes(vague))) {
      issues.push({
        selector: $link.toString(),
        ruleId: 'link-name-clarity',
        wcag: ['wcag2a', '2.4.4'],
        severity: 'moderate',
        message: 'Link text is vague and not descriptive',
        source: 'static-analysis'
      });
    }
  });

  // 8. Positive tabindex values
  $('[tabindex]').each((_, element) => {
    const $el = $(element);
    const tabindex = $el.attr('tabindex');
    if (tabindex && parseInt(tabindex) > 0) {
      issues.push({
        selector: $el.toString(),
        ruleId: 'no-positive-tabindex',
        wcag: ['wcag2a', '2.4.3'],
        severity: 'moderate',
        message: 'Element has positive tabindex value which can create confusing tab order',
        source: 'static-analysis'
      });
    }
  });

  // 9. Invalid aria-expanded values
  $('[aria-expanded]').each((_, element) => {
    const $el = $(element);
    const ariaExpanded = $el.attr('aria-expanded');
    if (ariaExpanded && !['true', 'false'].includes(ariaExpanded)) {
      issues.push({
        selector: $el.toString(),
        ruleId: 'aria-expanded-boolean',
        wcag: ['wcag2a', '4.1.1'],
        severity: 'moderate',
        message: 'aria-expanded should have boolean values (true/false)',
        source: 'static-analysis'
      });
    }
  });

  // 10. Invalid ARIA roles
  $('[role]').each((_, element) => {
    const $el = $(element);
    const role = $el.attr('role');
    if (role) {
      const validRoles = [
        'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
        'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
        'contentinfo', 'definition', 'dialog', 'directory', 'document',
        'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading',
        'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main',
        'marquee', 'math', 'menu', 'menubar', 'menuitem', 'meter',
        'navigation', 'none', 'note', 'option', 'presentation', 'progressbar',
        'radio', 'radiogroup', 'region', 'row', 'rowgroup', 'rowheader',
        'scrollbar', 'search', 'searchbox', 'separator', 'slider', 'spinbutton',
        'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel', 'term',
        'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem'
      ];
      
      if (!validRoles.includes(role)) {
        issues.push({
          selector: $el.toString(),
          ruleId: 'aria-role-valid',
          wcag: ['wcag2a', '4.1.1'],
          severity: 'moderate',
          message: `Invalid ARIA role: ${role}`,
          source: 'static-analysis'
        });
      }
    }
  });

  // 11. Heading hierarchy issues
  const headings: Array<{ level: number; element: cheerio.Element }> = [];
  $('h1, h2, h3, h4, h5, h6').each((_, element) => {
    const level = parseInt(element.tagName.charAt(1));
    headings.push({ level, element });
  });
  
  for (let i = 1; i < headings.length; i++) {
    const current = headings[i];
    const previous = headings[i - 1];
    
    if (current.level > previous.level + 1) {
      issues.push({
        selector: $(current.element).toString(),
        ruleId: 'heading-order',
        wcag: ['wcag2a', '1.3.1'],
        severity: 'moderate',
        message: `Heading level ${current.level} skips level ${previous.level + 1}`,
        source: 'static-analysis'
      });
    }
  }

  // 12. Missing main landmark
  if ($('main').length === 0) {
    issues.push({
      selector: 'body',
      ruleId: 'landmark-one-main',
      wcag: ['wcag2a', '1.3.1'],
      severity: 'moderate',
      message: 'Page should have a main landmark',
      source: 'static-analysis'
    });
  }

  // 13. Missing navigation landmark
  if ($('nav').length === 0) {
    issues.push({
      selector: 'body',
      ruleId: 'landmark-navigation',
      wcag: ['wcag2a', '1.3.1'],
      severity: 'moderate',
      message: 'Page should have navigation landmarks',
      source: 'static-analysis'
    });
  }

  // 14. Missing contentinfo landmark
  if ($('footer, [role="contentinfo"]').length === 0) {
    issues.push({
      selector: 'body',
      ruleId: 'landmark-contentinfo',
      wcag: ['wcag2a', '1.3.1'],
      severity: 'moderate',
      message: 'Page should have a contentinfo landmark (footer)',
      source: 'static-analysis'
    });
  }

  // 15. Empty headings
  $('h1, h2, h3, h4, h5, h6').each((_, element) => {
    const $heading = $(element);
    const text = $heading.text().trim();
    if (!text) {
      issues.push({
        selector: $heading.toString(),
        ruleId: 'empty-heading',
        wcag: ['wcag2a', '1.3.1'],
        severity: 'moderate',
        message: 'Heading element is empty',
        source: 'static-analysis'
      });
    }
  });

  // 16. Missing form submit buttons
  $('form').each((_, element) => {
    const $form = $(element);
    const hasSubmitButton = $form.find('input[type="submit"], button[type="submit"], button:not([type])').length > 0;
    
    if (!hasSubmitButton) {
      issues.push({
        selector: $form.toString(),
        ruleId: 'form-submit-button',
        wcag: ['wcag2a', '3.2.2'],
        severity: 'moderate',
        message: 'Form should have a submit button',
        source: 'static-analysis'
      });
    }
  });

  return {
    issues,
    meta: {
      title,
      description,
      language,
      viewport,
      hasSkipLink,
      headingCount,
      formCount,
      imageCount,
      linkCount
    }
  };
}

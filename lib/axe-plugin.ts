// Type declarations for axe-core
declare global {
  var axe: {
    registerCheck: (check: any) => void;
    registerRule: (rule: any) => void;
  };
}

export function registerCustomRules() {
  // Check if we're in a browser environment and axe is available
  if (typeof window === 'undefined' || typeof axe === 'undefined') {
    console.warn('Axe-core not available, skipping custom rules registration');
    return;
  }

  // Vague link text check
  axe.registerCheck({
    id: "vague-link-text",
    evaluate: (node: HTMLElement) => {
      const text = (node.innerText || "").trim().toLowerCase();
      const vagueTexts = [
        'click here', 'read more', 'more', 'learn more', 'here', 
        'this', 'that', 'link', 'click', 'go', 'continue', 'next',
        'previous', 'back', 'forward', 'submit', 'send', 'ok', 'yes', 'no'
      ];
      return !vagueTexts.some(vague => text.includes(vague));
    },
    metadata: { 
      impact: "moderate",
      description: "Link text should be descriptive and not vague",
      help: "Use descriptive link text that explains the destination or action"
    },
  });

  axe.registerRule({
    id: "link-name-clarity",
    selector: "a[href]",
    any: ["vague-link-text"],
    metadata: { 
      description: "Links must have descriptive text", 
      help: "Avoid vague link text like 'click here' or 'read more'" 
    },
    tags: ["wcag2a", "wcag241", "2.4.4"],
  });

  // Tabindex > 0 check
  axe.registerCheck({
    id: "tabindex-positive",
    evaluate: (node: HTMLElement) => {
      const tabindex = node.getAttribute('tabindex');
      return !tabindex || parseInt(tabindex) <= 0;
    },
    metadata: { 
      impact: "moderate",
      description: "Elements should not have positive tabindex values",
      help: "Positive tabindex values can create confusing tab order"
    },
  });

  axe.registerRule({
    id: "no-positive-tabindex",
    selector: "[tabindex]",
    all: ["tabindex-positive"],
    metadata: { 
      description: "Avoid positive tabindex values", 
      help: "Use natural tab order instead of positive tabindex" 
    },
    tags: ["wcag2a", "wcag241", "2.4.3"],
  });

  // Aria-expanded mismatch check
  axe.registerCheck({
    id: "aria-expanded-valid",
    evaluate: (node: HTMLElement) => {
      const ariaExpanded = node.getAttribute('aria-expanded');
      if (!ariaExpanded) return true; // No aria-expanded is fine
      
      const validValues = ['true', 'false'];
      return validValues.includes(ariaExpanded);
    },
    metadata: { 
      impact: "moderate",
      description: "aria-expanded should have valid boolean values",
      help: "aria-expanded should be 'true' or 'false'"
    },
  });

  axe.registerRule({
    id: "aria-expanded-boolean",
    selector: "[aria-expanded]",
    all: ["aria-expanded-valid"],
    metadata: { 
      description: "aria-expanded must have boolean values", 
      help: "Use 'true' or 'false' for aria-expanded attribute" 
    },
    tags: ["wcag2a", "wcag411", "4.1.1"],
  });

  // Missing alt text for decorative images
  axe.registerCheck({
    id: "decorative-image-alt",
    evaluate: (node: HTMLImageElement) => {
      const alt = node.getAttribute('alt');
      const role = node.getAttribute('role');
      
      // If role is presentation or decorative, alt should be empty
      if (role === 'presentation' || role === 'none') {
        return alt === '' || alt === null;
      }
      
      // If image is decorative (no meaningful content), alt should be empty
      const isDecorative = node.getAttribute('data-decorative') === 'true' || 
                          node.classList.contains('decorative') ||
                          node.getAttribute('aria-hidden') === 'true';
      
      if (isDecorative) {
        return alt === '' || alt === null;
      }
      
      return true; // Non-decorative images should have alt text
    },
    metadata: { 
      impact: "moderate",
      description: "Decorative images should have empty alt text",
      help: "Use alt='' for decorative images, meaningful alt text for content images"
    },
  });

  axe.registerRule({
    id: "decorative-image-alt-text",
    selector: "img",
    all: ["decorative-image-alt"],
    metadata: { 
      description: "Decorative images should have appropriate alt text", 
      help: "Use empty alt text for decorative images" 
    },
    tags: ["wcag2a", "wcag111", "1.1.1"],
  });

  // Form field without label
  axe.registerCheck({
    id: "form-field-labeled",
    evaluate: (node: HTMLElement) => {
      const tagName = node.tagName.toLowerCase();
      const inputTypes = ['input', 'select', 'textarea'];
      
      if (!inputTypes.includes(tagName)) return true;
      
      // Check for explicit label
      const id = node.getAttribute('id');
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) return true;
      }
      
      // Check for aria-label
      if (node.getAttribute('aria-label')) return true;
      
      // Check for aria-labelledby
      if (node.getAttribute('aria-labelledby')) return true;
      
      // Check for title attribute
      if (node.getAttribute('title')) return true;
      
      // Check for placeholder (for some input types)
      const type = node.getAttribute('type');
      if (type === 'text' || type === 'email' || type === 'password' || type === 'search' || type === 'tel' || type === 'url') {
        if (node.getAttribute('placeholder')) return true;
      }
      
      return false;
    },
    metadata: { 
      impact: "critical",
      description: "Form fields must have accessible labels",
      help: "Provide labels for all form fields using label, aria-label, or other labeling methods"
    },
  });

  axe.registerRule({
    id: "form-field-labels",
    selector: "input, select, textarea",
    all: ["form-field-labeled"],
    metadata: { 
      description: "Form fields must have accessible labels", 
      help: "Ensure all form fields have proper labels" 
    },
    tags: ["wcag2a", "wcag131", "1.3.1"],
  });

  // Missing language attribute check
  axe.registerCheck({
    id: "html-lang-attribute",
    evaluate: (node: HTMLElement) => {
      if (node.tagName.toLowerCase() !== 'html') return true;
      const lang = node.getAttribute('lang');
      return lang && lang.trim().length > 0;
    },
    metadata: { 
      impact: "critical",
      description: "HTML element must have a lang attribute",
      help: "Add a lang attribute to the HTML element to specify the document language"
    },
  });

  axe.registerRule({
    id: "html-has-lang",
    selector: "html",
    all: ["html-lang-attribute"],
    metadata: { 
      description: "HTML element must have a lang attribute", 
      help: "Add lang attribute to HTML element" 
    },
    tags: ["wcag2a", "wcag311", "3.1.1"],
  });

  // Heading hierarchy check
  axe.registerCheck({
    id: "heading-hierarchy",
    evaluate: (node: HTMLElement) => {
      const tagName = node.tagName.toLowerCase();
      if (!tagName.match(/^h[1-6]$/)) return true;
      
      const level = parseInt(tagName.charAt(1));
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let previousLevel = 0;
      
      for (let i = 0; i < headings.length; i++) {
        const currentHeading = headings[i] as HTMLElement;
        const currentLevel = parseInt(currentHeading.tagName.charAt(1));
        
        if (currentHeading === node) {
          // Check if this heading skips levels
          if (currentLevel > previousLevel + 1) {
            return false;
          }
          break;
        }
        previousLevel = currentLevel;
      }
      
      return true;
    },
    metadata: { 
      impact: "moderate",
      description: "Heading levels should not be skipped",
      help: "Use heading levels in order (h1, h2, h3, etc.) without skipping levels"
    },
  });

  axe.registerRule({
    id: "heading-order",
    selector: "h1, h2, h3, h4, h5, h6",
    all: ["heading-hierarchy"],
    metadata: { 
      description: "Heading levels should not be skipped", 
      help: "Use proper heading hierarchy without skipping levels" 
    },
    tags: ["wcag2a", "wcag131", "1.3.1"],
  });

  // Skip link check
  axe.registerCheck({
    id: "skip-link-present",
    evaluate: (node: HTMLElement) => {
      // Check if there's a skip link at the beginning of the page
      const skipLinks = document.querySelectorAll('a[href^="#"]');
      for (let i = 0; i < skipLinks.length; i++) {
        const link = skipLinks[i] as HTMLElement;
        const text = (link.innerText || "").toLowerCase();
        if (text.includes('skip') || text.includes('jump')) {
          // Check if it's one of the first few links
          const allLinks = document.querySelectorAll('a');
          const linkIndex = Array.from(allLinks).indexOf(link);
          if (linkIndex < 5) {
            return true;
          }
        }
      }
      return false;
    },
    metadata: { 
      impact: "moderate",
      description: "Page should have a skip link for keyboard users",
      help: "Add a skip link at the beginning of the page for keyboard navigation"
    },
  });

  axe.registerRule({
    id: "skip-link",
    selector: "body",
    any: ["skip-link-present"],
    metadata: { 
      description: "Page should have a skip link", 
      help: "Add a skip link for keyboard users" 
    },
    tags: ["wcag2a", "wcag241", "2.4.1"],
  });

  // ARIA role validation
  axe.registerCheck({
    id: "aria-role-valid",
    evaluate: (node: HTMLElement) => {
      const role = node.getAttribute('role');
      if (!role) return true;
      
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
      
      return validRoles.includes(role);
    },
    metadata: { 
      impact: "moderate",
      description: "ARIA role should be valid",
      help: "Use only valid ARIA roles"
    },
  });

  axe.registerRule({
    id: "aria-role-valid",
    selector: "[role]",
    all: ["aria-role-valid"],
    metadata: { 
      description: "ARIA roles must be valid", 
      help: "Use only valid ARIA roles" 
    },
    tags: ["wcag2a", "wcag411", "4.1.1"],
  });

  // Meta viewport check
  axe.registerCheck({
    id: "meta-viewport",
    evaluate: (node: HTMLElement) => {
      if (node.tagName.toLowerCase() !== 'meta') return true;
      const name = node.getAttribute('name');
      if (name !== 'viewport') return true;
      
      const content = node.getAttribute('content');
      if (!content) return false;
      
      // Check if user-scalable is set to no
      if (content.includes('user-scalable=no')) {
        return false;
      }
      
      return true;
    },
    metadata: { 
      impact: "critical",
      description: "Viewport should allow user scaling",
      help: "Do not disable user scaling in viewport meta tag"
    },
  });

  axe.registerRule({
    id: "meta-viewport-scale",
    selector: "meta[name='viewport']",
    all: ["meta-viewport"],
    metadata: { 
      description: "Viewport should allow user scaling", 
      help: "Allow user scaling in viewport meta tag" 
    },
    tags: ["wcag2a", "wcag141", "1.4.4"],
  });

  // Focus indicator check
  axe.registerCheck({
    id: "focus-indicator",
    evaluate: (node: HTMLElement) => {
      const style = window.getComputedStyle(node);
      const outline = style.outline;
      const boxShadow = style.boxShadow;
      
      // Check if element has focus indicator
      if (outline !== 'none' && outline !== '') return true;
      if (boxShadow !== 'none' && boxShadow !== '') return true;
      
      // Check for custom focus styles
      const focusStyles = node.querySelectorAll('*:focus');
      if (focusStyles.length > 0) return true;
      
      return false;
    },
    metadata: { 
      impact: "critical",
      description: "Focusable elements should have visible focus indicators",
      help: "Ensure focusable elements have visible focus indicators"
    },
  });

  axe.registerRule({
    id: "focus-visible",
    selector: "a, button, input, select, textarea, [tabindex]",
    any: ["focus-indicator"],
    metadata: { 
      description: "Focusable elements should have visible focus indicators", 
      help: "Add visible focus indicators to focusable elements" 
    },
    tags: ["wcag2a", "wcag241", "2.4.7"],
  });
}

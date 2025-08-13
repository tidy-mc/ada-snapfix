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
}

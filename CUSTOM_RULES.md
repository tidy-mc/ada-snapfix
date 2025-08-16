# Enhanced Accessibility Rules

This application includes comprehensive custom accessibility rules that extend the standard axe-core functionality and provide enhanced WCAG 2.1/2.2 AA coverage.

## Coverage Overview

The enhanced scanner combines multiple analysis methods:
- **Static HTML Analysis**: 16+ custom checks using Cheerio
- **Enhanced Axe-Core**: Standard rules + 10+ custom rules
- **Pa11y Integration**: Additional WCAG compliance checks
- **Expected Coverage**: 80%+ WCAG 2.1/2.2 AA criteria

## Implemented Custom Rules

### 1. Link Name Clarity (`link-name-clarity`)
**Rule ID**: `link-name-clarity`  
**Impact**: Moderate  
**WCAG**: 2.4.4 (Link Purpose)

**Description**: Detects vague link text that doesn't clearly indicate the destination or purpose.

**Examples of Vague Text**:
- "Click here"
- "Read more"
- "More"
- "Learn more"
- "Here"
- "This"
- "That"
- "Link"
- "Click"
- "Go"
- "Continue"
- "Next"
- "Previous"
- "Back"
- "Forward"
- "Submit"
- "Send"
- "OK"
- "Yes"
- "No"

**How to Fix**: Use descriptive link text that explains the destination or action.

### 2. No Positive Tabindex (`no-positive-tabindex`)
**Rule ID**: `no-positive-tabindex`  
**Impact**: Moderate  
**WCAG**: 2.4.3 (Focus Order)

**Description**: Detects elements with positive tabindex values that can create confusing tab order.

**How to Fix**: Use natural tab order instead of positive tabindex values.

### 3. Aria-Expanded Boolean (`aria-expanded-boolean`)
**Rule ID**: `aria-expanded-boolean`  
**Impact**: Moderate  
**WCAG**: 4.1.1 (Parsing)

**Description**: Ensures aria-expanded attributes have valid boolean values.

**Valid Values**: `"true"`, `"false"`

**How to Fix**: Use only "true" or "false" for aria-expanded attributes.

### 4. Decorative Image Alt Text (`decorative-image-alt-text`)
**Rule ID**: `decorative-image-alt-text`  
**Impact**: Moderate  
**WCAG**: 1.1.1 (Non-text Content)

**Description**: Ensures decorative images have appropriate alt text (empty for decorative, meaningful for content).

**How to Fix**: 
- Use `alt=""` for decorative images
- Use meaningful alt text for content images
- Add `role="presentation"` or `aria-hidden="true"` for decorative images

### 5. Form Field Labels (`form-field-labels`)
**Rule ID**: `form-field-labels`  
**Impact**: Critical  
**WCAG**: 1.3.1 (Info and Relationships)

**Description**: Ensures all form fields have accessible labels.

**Accepted Label Methods**:
- Explicit `<label>` element with `for` attribute
- `aria-label` attribute
- `aria-labelledby` attribute
- `title` attribute
- `placeholder` attribute (for text inputs)

**How to Fix**: Provide labels for all form fields using one of the accepted methods.

### 6. HTML Language Attribute (`html-has-lang`)
**Rule ID**: `html-has-lang`  
**Impact**: Critical  
**WCAG**: 3.1.1 (Language of Page)

**Description**: Ensures the HTML element has a lang attribute.

**How to Fix**: Add a lang attribute to the HTML element (e.g., `<html lang="en">`).

### 7. Heading Order (`heading-order`)
**Rule ID**: `heading-order`  
**Impact**: Moderate  
**WCAG**: 1.3.1 (Info and Relationships)

**Description**: Ensures heading levels are not skipped (e.g., h1 → h3).

**How to Fix**: Use heading levels in order (h1, h2, h3, etc.) without skipping levels.

### 8. Skip Link (`skip-link`)
**Rule ID**: `skip-link`  
**Impact**: Moderate  
**WCAG**: 2.4.1 (Bypass Blocks)

**Description**: Ensures the page has a skip link for keyboard users.

**How to Fix**: Add a skip link at the beginning of the page for keyboard navigation.

### 9. ARIA Role Validation (`aria-role-valid`)
**Rule ID**: `aria-role-valid`  
**Impact**: Moderate  
**WCAG**: 4.1.1 (Parsing)

**Description**: Ensures ARIA roles are valid.

**How to Fix**: Use only valid ARIA roles from the WAI-ARIA specification.

### 10. Meta Viewport Scale (`meta-viewport-scale`)
**Rule ID**: `meta-viewport-scale`  
**Impact**: Critical  
**WCAG**: 1.4.4 (Resize Text)

**Description**: Ensures viewport meta tag allows user scaling.

**How to Fix**: Do not disable user scaling in viewport meta tag.

### 11. Focus Visible (`focus-visible`)
**Rule ID**: `focus-visible`  
**Impact**: Critical  
**WCAG**: 2.4.7 (Focus Visible)

**Description**: Ensures focusable elements have visible focus indicators.

**How to Fix**: Add visible focus indicators to focusable elements.

## Static Analysis Rules

### 12. Document Title (`document-title`)
**Rule ID**: `document-title`  
**Impact**: Critical  
**WCAG**: 2.4.2 (Page Titled)

**Description**: Ensures the document has a title element.

**How to Fix**: Add a descriptive title element to the document.

### 13. Meta Viewport (`meta-viewport`)
**Rule ID**: `meta-viewport`  
**Impact**: Moderate  
**WCAG**: 1.4.4 (Resize Text)

**Description**: Ensures viewport meta tag is present for responsive design.

**How to Fix**: Add a viewport meta tag for responsive design.

### 14. Landmark One Main (`landmark-one-main`)
**Rule ID**: `landmark-one-main`  
**Impact**: Moderate  
**WCAG**: 1.3.1 (Info and Relationships)

**Description**: Ensures the page has a main landmark.

**How to Fix**: Add a main landmark to the page.

### 15. Landmark Navigation (`landmark-navigation`)
**Rule ID**: `landmark-navigation`  
**Impact**: Moderate  
**WCAG**: 1.3.1 (Info and Relationships)

**Description**: Ensures the page has navigation landmarks.

**How to Fix**: Add navigation landmarks to the page.

### 16. Landmark Contentinfo (`landmark-contentinfo`)
**Rule ID**: `landmark-contentinfo`  
**Impact**: Moderate  
**WCAG**: 1.3.1 (Info and Relationships)

**Description**: Ensures the page has a contentinfo landmark (footer).

**How to Fix**: Add a footer or contentinfo landmark to the page.

### 17. Empty Heading (`empty-heading`)
**Rule ID**: `empty-heading`  
**Impact**: Moderate  
**WCAG**: 1.3.1 (Info and Relationships)

**Description**: Ensures heading elements are not empty.

**How to Fix**: Add content to empty heading elements or remove them.

### 18. Form Submit Button (`form-submit-button`)
**Rule ID**: `form-submit-button`  
**Impact**: Moderate  
**WCAG**: 3.2.2 (On Input)

**Description**: Ensures forms have submit buttons.

**How to Fix**: Add submit buttons to forms.

## Pa11y Integration

The enhanced scanner includes Pa11y integration for additional WCAG compliance checks:

### Pa11y Rules
- **Color Contrast**: Elements must have sufficient color contrast
- **Focus Order Semantics**: Focus order should match logical tab order
- **Keyboard Navigation**: All interactive elements must be keyboard accessible
- **Form Field Multiple Labels**: Form fields should not have multiple labels
- **Link in Text Block**: Links should be distinguishable from surrounding text

## Usage

These enhanced rules are automatically included when using the enhanced simple scan endpoint:

```bash
POST /api/scan/enhanced-simple
{
  "url": "https://example.com"
}
```

## Configuration

Enhanced rules can be enabled/disabled in the API route by modifying the `rules` object in `app/api/scan/enhanced-simple/route.ts`:

```typescript
rules: {
  // Standard rules...
  'link-name-clarity': { enabled: true },
  'no-positive-tabindex': { enabled: true },
  'aria-expanded-boolean': { enabled: true },
  'decorative-image-alt-text': { enabled: true },
  'form-field-labels': { enabled: true },
  'html-has-lang': { enabled: true },
  'heading-order': { enabled: true },
  'skip-link': { enabled: true },
  'aria-role-valid': { enabled: true },
  'meta-viewport-scale': { enabled: true },
  'focus-visible': { enabled: true }
}
```

## Testing

Test the enhanced rules by scanning websites with known accessibility issues:

- Sites with "Click here" links
- Forms without proper labels
- Images without alt text
- Elements with positive tabindex values
- Pages without proper heading hierarchy
- Sites without skip links
- Pages with invalid ARIA roles

## Coverage Metrics

The enhanced scanner provides detailed coverage metrics:

- **WCAG Coverage**: Percentage of WCAG 2.1/2.2 AA criteria covered
- **Issues by Source**: Breakdown by analysis method (axe-core, pa11y, static-analysis)
- **Issues by Severity**: Breakdown by impact level (critical, moderate, minor)
- **Page Information**: Document structure analysis

## Expected Results

With the enhanced scanner, you should achieve:
- **80%+ WCAG 2.1/2.2 AA coverage** (up from ~57% with basic axe-core)
- **Comprehensive issue detection** across multiple analysis methods
- **Detailed reporting** with deduplication and scoring
- **Vercel compatibility** without browser dependencies

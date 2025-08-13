# Custom Axe-Core Rules

This application includes custom accessibility rules that extend the standard axe-core functionality.

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

## Usage

These custom rules are automatically included when scanning websites. They complement the standard axe-core rules to provide more comprehensive accessibility testing.

## Configuration

Custom rules can be enabled/disabled in the API route by modifying the `rules` object in `app/app/api/scan/route.ts`:

```typescript
rules: {
  // Standard rules...
  'link-name-clarity': { enabled: true },
  'no-positive-tabindex': { enabled: true },
  'aria-expanded-boolean': { enabled: true },
  'decorative-image-alt-text': { enabled: true },
  'form-field-labels': { enabled: true },
}
```

## Adding New Rules

To add new custom rules:

1. Add the rule logic to `app/lib/axe-plugin.ts`
2. Register the rule using `axe.registerCheck()` and `axe.registerRule()`
3. Enable the rule in the API route configuration
4. Update this documentation

## Testing

Test the custom rules by scanning websites with known accessibility issues:

- Sites with "Click here" links
- Forms without proper labels
- Images without alt text
- Elements with positive tabindex values

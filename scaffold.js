const fs = require('fs');
const path = require('path');

// List of top-level components from @telegram-apps/telegram-ui
const components = [
  "Accordion", "Avatar", "Badge", "Banner", "Blockquote", "Button", "Card",
  "Cell", "Info", "Navigation", "IconButton", "Image", "InlineButtons", "List",
  "Placeholder", "Section", "Steps", "Timeline", "CircularProgress", "Progress",
  "Skeleton", "Snackbar", "Spinner", "Spoiler", "Checkbox", "Chip", "ColorInput",
  "FileInput", "Input", "Multiselect", "PinInput", "Radio",
  "Rating", "Select", "Slider", "Switch", "Textarea", "FixedLayout",
  "Tabbar", "Divider", "Breadcrumbs", "CompactPagination", "Pagination",
  "SegmentedControl", "TabsList", "Modal", "Popper", "Tooltip", "Caption",
  "Headline", "LargeTitle", "Subheadline", "Text", "Title"
];

const uiDir = path.join(__dirname, 'src', 'components', 'ui');

if (!fs.existsSync(uiDir)) {
  fs.mkdirSync(uiDir, { recursive: true });
}

let indexExports = '';

components.forEach((cmp) => {
  const cmpDir = path.join(uiDir, cmp);
  
  if (!fs.existsSync(cmpDir)) {
    fs.mkdirSync(cmpDir, { recursive: true });
  }

  const cmpFile = path.join(cmpDir, `${cmp}.tsx`);
  
  // Create wrapper that actually imports from @telegram-apps/telegram-ui
  const code = `'use client';

import * as React from 'react';
import { ${cmp} as TG${cmp} } from '@telegram-apps/telegram-ui';
import { cn } from '@/lib/utils';

export type ${cmp}Props = React.ComponentProps<typeof TG${cmp}>;

export const ${cmp} = React.forwardRef<React.ElementRef<typeof TG${cmp}>, ${cmp}Props>(
  ({ className, ...props }, ref) => {
    return (
      <TG${cmp} ref={ref} className={cn('', className)} {...props} />
    );
  }
);
${cmp}.displayName = '${cmp}';
`;
  // We overwrite the existing dummy ones
  fs.writeFileSync(cmpFile, code, 'utf-8');

  const indexFile = path.join(cmpDir, 'index.ts');
  fs.writeFileSync(indexFile, `export * from "./${cmp}";\n`, 'utf-8');

  indexExports += `export * from "./${cmp}";\n`;
});

// Since the user might want to use subcomponents like Accordion.Summary, we should probably just rely on the fact that if they need subcomponents they can do it, but wait: if TGAccordion has .Summary, our wrapper won't have .Summary. 
// Let's add subcomponents attachment to the wrapper using Object.assign if needed, but for now simple wrapper is a huge step up.
// Actually, let's just make it simpler: export the TG component directly and wrap it, or just let the user add subcomponents manually.
// Actually, a better way to attach subcomponents:
// Object.assign(${cmp}, TG${cmp});
// This will copy static properties like Summary, Content, etc.

components.forEach((cmp) => {
  const cmpFile = path.join(uiDir, cmp, `${cmp}.tsx`);
  let content = fs.readFileSync(cmpFile, 'utf-8');
  content = content.replace(`${cmp}.displayName = '${cmp}';`, `${cmp}.displayName = '${cmp}';\n\nObject.assign(${cmp}, TG${cmp});`);
  fs.writeFileSync(cmpFile, content, 'utf-8');
});

fs.writeFileSync(path.join(uiDir, 'index.ts'), indexExports, 'utf-8');

console.log('Successfully scaffolded Telegram UI wrappers!');

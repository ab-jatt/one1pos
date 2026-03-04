const fs = require('fs');
const path = require('path');

const files = [
  { file: 'pages/POS.tsx', importLine: 3 },
  { file: 'pages/Customers.tsx', importLine: 7 },
  { file: 'pages/Settings.tsx', importLine: 6 },
  { file: 'pages/Suppliers.tsx', importLine: 7 },
  { file: 'pages/Purchasing.tsx', importLine: 8 },
  { file: 'pages/Inventory.tsx', importLine: 8 },
  { file: 'pages/HR.tsx', importLine: 8 },
  { file: 'pages/Reports.tsx', importLine: 8 },
  { file: 'pages/Accounting.tsx', importLine: 6 },
  { file: 'pages/Security.tsx', importLine: 5 },
  { file: 'pages/Warehouses.tsx', importLine: 2 },
  { file: 'pages/WarehouseReports.tsx', importLine: 2 },
];

files.forEach(({ file, importLine }) => {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  
  // Find the lucide-react import line
  const lucideLine = lines.find(l => l.includes("from 'lucide-react'"));
  if (!lucideLine) {
    console.log(`\n=== ${file}: NO LUCIDE IMPORT ===`);
    return;
  }
  
  // Extract icon names from import
  const match = lucideLine.match(/\{([^}]+)\}/);
  if (!match) return;
  
  const icons = match[1].split(',').map(s => s.trim()).filter(s => s.length > 0);
  // Handle "Image as ImageIcon" type imports
  const iconNames = icons.map(s => {
    if (s.includes(' as ')) {
      return { imported: s.split(' as ')[0].trim(), local: s.split(' as ')[1].trim() };
    }
    return { imported: s, local: s };
  });
  
  // Get body content (everything except the import line)
  const bodyLines = lines.filter((_, idx) => idx !== lines.indexOf(lucideLine));
  const body = bodyLines.join('\n');
  
  const unused = [];
  const used = [];
  
  iconNames.forEach(({ imported, local }) => {
    // Check for JSX usage: <IconName, or reference as variable: {IconName}, icon: IconName, icon={IconName}
    const jsxPattern = new RegExp(`<${local}[\\s/>]`);
    const refPattern = new RegExp(`\\b${local}\\b`);
    
    if (refPattern.test(body)) {
      // Found a reference - but is it a real usage or just a class/variable name collision?
      // Check if it's actually used as a component or reference
      used.push(local);
    } else {
      unused.push(local);
    }
  });
  
  console.log(`\n=== ${file} ===`);
  console.log(`UNUSED ICONS (${unused.length}): ${unused.join(', ') || 'NONE'}`);
});

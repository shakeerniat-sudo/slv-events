const fs = require('fs');
const path = require('path');

function processDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Remove "import React from 'react';" completely
      let newContent = content.replace(/^import React from 'react';\r?\n/gm, '');
      
      // Replace "import React, { ... } from 'react';" with "import { ... } from 'react';"
      newContent = newContent.replace(/^import React, \{(.+?)\} from 'react';\r?\n/gm, 'import {$1} from \'react\';\n');
      
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
      }
    }
  });
}

processDir('src');
console.log('Done modifying React imports');

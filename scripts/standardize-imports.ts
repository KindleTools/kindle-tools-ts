
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

// Read package.json
const pkgPath = path.join(ROOT_DIR, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const imports = pkg.imports || {};

interface MappingRule {
    aliasPattern: string;
    targetPattern: string; // Relative to project root, e.g., "src/core/"
    isWildcard: boolean;
}

const rules: MappingRule[] = [];

for (const [alias, target] of Object.entries(imports) as [string, string][]) {
    if (typeof target !== 'string') continue;

    // Normalize target: remove leading ./
    const cleanTarget = target.startsWith('./') ? target.slice(2) : target;

    if (alias.includes('*') && cleanTarget.includes('*')) {
        // Wildcard
        rules.push({
            aliasPattern: alias,
            targetPattern: cleanTarget,
            isWildcard: true
        });
    } else {
        // Exact match
        rules.push({
            aliasPattern: alias,
            targetPattern: cleanTarget,
            isWildcard: false
        });
    }
}

// Sort rules by specificity (longer target pattern first)
rules.sort((a, b) => {
    const aLen = a.targetPattern.length;
    const bLen = b.targetPattern.length;
    return bLen - aLen;
});

function walk(dir: string, fileList: string[] = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const p = path.join(dir, file);
        if (fs.statSync(p).isDirectory()) {
            walk(p, fileList);
        } else {
            if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
                fileList.push(p);
            }
        }
    }
    return fileList;
}

const files = walk(SRC_DIR);

function resolveImport(filePath: string, importPath: string): string | null {
    if (!importPath.startsWith('.')) return null; // Ignore non-relative

    const fileDir = path.dirname(filePath);
    const resolvedAbsolutePath = path.resolve(fileDir, importPath);
    let relativeToRoot = path.relative(ROOT_DIR, resolvedAbsolutePath);

    // Normalize to forward slashes
    relativeToRoot = relativeToRoot.split(path.sep).join('/');

    // Handle extension mapping
    // Import usually has .js, file has .ts
    let targetFile = relativeToRoot;
    if (targetFile.endsWith('.js')) {
        targetFile = targetFile.replace(/\.js$/, '.ts');
    } else if (!targetFile.endsWith('.ts')) {
        // If no extension, we might assume .ts (not standard for NodeNext but good for safety)
        // Let's assume the user uses explicit extensions as per code style
    }

    // Verify if it is a local relative import (sibling or child)
    // In hybrid approach, we keep `./` imports as relative
    if (importPath.startsWith('./')) {
        return null;
    }

    // Now match against rules
    for (const rule of rules) {
        if (rule.isWildcard) {
            const [targetPrefix, targetSuffix] = rule.targetPattern.split('*');
            const [aliasPrefix, aliasSuffix] = rule.aliasPattern.split('*');

            if (targetFile.startsWith(targetPrefix) && targetFile.endsWith(targetSuffix)) {
                // Extract wildcard part
                const wildcardPart = targetFile.slice(targetPrefix.length, targetFile.length - targetSuffix.length);
                return aliasPrefix + wildcardPart + aliasSuffix;
            }
        } else {
            if (targetFile === rule.targetPattern) {
                return rule.aliasPattern;
            }
        }
    }

    return null;
}

console.log(`Scanning ${files.length} files...`);
let totalChanges = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    let changed = false;

    // Replace imports: from "..."
    // This covers `import ... from "..."` and `export ... from "..."`
    content = content.replace(/(from\s+['"])([^'"]+)(['"])/g, (match, prefix, imp, suffix) => {
        if (!imp.startsWith('.')) return match;

        const newImport = resolveImport(file, imp);
        if (newImport) {
            // Prevent self-import via alias if inside the same package (circular logic not an issue, but check needed?)
            // Actually, subpath imports work fine.

            // Don't change if no change (redundant check)
            if (imp === newImport) return match;

            console.log(`[${path.relative(ROOT_DIR, file)}] ${imp} -> ${newImport}`);
            changed = true;
            totalChanges++;
            return `${prefix}${newImport}${suffix}`;
        }
        return match;
    });

    // Replace dynamic imports: import("...")
    content = content.replace(/(import\(['"])([^'"]+)(['"]\))/g, (match, prefix, imp, suffix) => {
        if (!imp.startsWith('.')) return match;
        const newImport = resolveImport(file, imp);
        if (newImport) {
            console.log(`[${path.relative(ROOT_DIR, file)}] Dynamic: ${imp} -> ${newImport}`);
            changed = true;
            totalChanges++;
            return `${prefix}${newImport}${suffix}`;
        }
        return match;
    });

    // Replace side-effect imports: import "..." (no from)
    // Regex: ^import\s+['"]...['"];? 
    // Or just look for `import "..."` anywhere.
    // Be careful not to overlap with `import ... from` which we handled.
    // We can use a specific regex that expects `import` then string literal immediately.
    content = content.replace(/(import\s+['"])([^'"]+)(['"])/g, (match, prefix, imp, suffix) => {
        // This regex matches `import "foo"` AND the start of `import "foo" from "bar"` is invalid syntax 
        // `import { x } from "foo"` -> `import` is far from string.
        // `import "foo"` is side effect.
        // `import func from "foo"` -> `import` space `func`.

        // Only match if it looks like side effect import.
        // But wait, `import "pkg"` is side effect.

        // To be safe, let's verify if the regex matches valid side-effect imports ONLY.
        // In TS: `import "./foo.js"`

        if (!imp.startsWith('.')) return match;

        // This regex `(import\s+['"])([^'"]+)(['"])` matches `import "pkg"`.
        // Does it match `import type { x } ...`? No.

        const newImport = resolveImport(file, imp);
        if (newImport) {
            console.log(`[${path.relative(ROOT_DIR, file)}] Side-effect: ${imp} -> ${newImport}`);
            changed = true;
            totalChanges++;
            return `${prefix}${newImport}${suffix}`;
        }
        return match;
    });


    if (changed) {
        fs.writeFileSync(file, content);
    }
});

console.log(`Finished. Total updates: ${totalChanges}`);

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const ROOT = resolve(process.env.FILE_WORKSPACE || join(process.cwd(), '..'));

function safePath(relative: string): string {
  const clean = relative.replace(/^[/\\]+/, '');
  const resolved = resolve(ROOT, clean);
  if (!resolved.startsWith(ROOT)) throw new Error('Path traversal blocked');
  return resolved;
}

const TEXT_EXTS = new Set([
  '.md',
  '.mdx',
  '.txt',
  '.html',
  '.htm',
  '.css',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.json',
  '.yaml',
  '.yml',
  '.xml',
  '.csv',
  '.svg',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.sh',
  '.bat',
  '.ps1',
  '.env',
  '.gitignore',
  '.toml',
]);

function isTextFile(path: string): boolean {
  return TEXT_EXTS.has(extname(path).toLowerCase());
}

function listDir(dirPath: string): any[] {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const items: any[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.') continue;
    try {
      const full = join(dirPath, entry.name);
      const stat = statSync(full);
      items.push({
        name: entry.name,
        path: full.replace(ROOT, '').replace(/\\/g, '/'),
        isDirectory: stat.isDirectory(),
        size: stat.size,
        isText: entry.isFile() && isTextFile(entry.name),
      });
    } catch {}
  }

  return items.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action');
  const relPath = req.nextUrl.searchParams.get('path') || '';

  try {
    const absPath = safePath(relPath);

    if (action === 'list') {
      if (!statSync(absPath).isDirectory()) {
        return NextResponse.json({ error: 'Not a directory' }, { status: 400 });
      }

      // Also include the parent path for navigation
      const parent = relPath ? dirname(relPath).replace(/\\/g, '/') : null;

      return NextResponse.json({
        current: relPath,
        parent: parent && parent !== '.' ? parent : null,
        root: ROOT,
        items: listDir(absPath),
      });
    }

    if (action === 'read') {
      if (statSync(absPath).isDirectory()) {
        return NextResponse.json({ error: 'Is a directory' }, { status: 400 });
      }
      const content = readFileSync(absPath, 'utf-8');
      return NextResponse.json({
        path: relPath,
        name: basename(relPath),
        content,
      });
    }

    return NextResponse.json({ error: 'Missing action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, path: relPath, content } = await req.json();

    if (action === 'write') {
      const absPath = safePath(relPath);
      const dir = dirname(absPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(absPath, content, 'utf-8');
      return NextResponse.json({ ok: true, path: relPath });
    }

    return NextResponse.json({ error: 'Missing action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

'use client';

import {
  FileIcon,
  FileTextIcon,
  FolderIcon,
  FolderOpenIcon,
  XIcon,
} from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

type FileItem = {
  isDirectory: boolean;
  isText: boolean;
  name: string;
  path: string;
  size: number;
};

type DirListing = {
  current: string;
  items: FileItem[];
  parent: string | null;
  root: string;
};

type FileBrowserProps = {
  onClose: () => void;
  onSelect: (path: string, name: string) => void;
  open: boolean;
};

export function FileBrowser({ open, onClose, onSelect }: FileBrowserProps) {
  const [listing, setListing] = React.useState<DirListing | null>(null);
  const [currentPath, setCurrentPath] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const fetchDir = React.useCallback(async (path: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/files?action=list&path=${encodeURIComponent(path)}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setListing(data);
      setCurrentPath(data.current);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) fetchDir('');
  }, [open, fetchDir]);

  const handleItemClick = (item: FileItem) => {
    if (item.isDirectory) {
      fetchDir(item.path);
    } else if (item.isText) {
      onSelect(item.path, item.name);
      onClose();
    }
  };

  const handleBack = () => {
    if (listing?.parent != null) {
      fetchDir(listing.parent);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30">
      <div className="flex max-h-[520px] w-[480px] flex-col rounded-lg border bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <FolderOpenIcon className="size-4 text-neutral-500" />
            <span className="font-medium text-sm">Browse Files</span>
          </div>
          <button
            className="flex size-6 items-center justify-center rounded-sm hover:bg-neutral-100"
            onClick={onClose}
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Path breadcrumb */}
        <div className="border-b bg-neutral-50 px-4 py-1.5">
          <span className="text-neutral-400 text-xs">
            {listing?.root}
            {currentPath ? `/${currentPath}` : ''}
          </span>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto">
          {error && <div className="p-4 text-red-600 text-sm">{error}</div>}

          {loading && (
            <div className="p-4 text-neutral-500 text-sm">Loading...</div>
          )}

          {listing && !loading && (
            <div>
              {/* Parent directory */}
              {listing.parent != null && (
                <button
                  className="flex w-full items-center gap-2 border-b px-4 py-2 text-left text-sm hover:bg-neutral-50"
                  onClick={handleBack}
                >
                  <FolderIcon className="size-4 text-neutral-400" />
                  <span className="text-neutral-500">..</span>
                </button>
              )}

              {listing.items.map((item) => {
                const isMd =
                  item.name.endsWith('.md') || item.name.endsWith('.mdx');
                return (
                  <button
                    className={cn(
                      'flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-neutral-50',
                      !item.isDirectory &&
                        !item.isText &&
                        'cursor-default opacity-40',
                      isMd && 'font-medium'
                    )}
                    disabled={!item.isDirectory && !item.isText}
                    key={item.path}
                    onClick={() => handleItemClick(item)}
                  >
                    {item.isDirectory ? (
                      <FolderIcon className="size-4 shrink-0 text-amber-500" />
                    ) : isMd ? (
                      <FileTextIcon className="size-4 shrink-0 text-blue-500" />
                    ) : (
                      <FileIcon className="size-4 shrink-0 text-neutral-400" />
                    )}
                    <span className={cn('truncate', isMd && 'text-blue-700')}>
                      {item.name}
                    </span>
                    {!item.isDirectory && (
                      <span className="ml-auto shrink-0 text-neutral-400 text-xs">
                        {item.size < 1024
                          ? `${item.size} B`
                          : item.size < 1024 * 1024
                            ? `${(item.size / 1024).toFixed(1)} KB`
                            : `${(item.size / (1024 * 1024)).toFixed(1)} MB`}
                      </span>
                    )}
                  </button>
                );
              })}

              {listing.items.length === 0 && listing.parent == null && (
                <div className="p-4 text-neutral-500 text-sm">
                  No files found in this directory.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

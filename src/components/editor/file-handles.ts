/**
 * External store for FileSystemFileHandles.
 * React state can lose live browser objects — this Map keeps them safe.
 */
const fileHandleStore = new Map<string, FileSystemFileHandle>();

export function setFileHandle(tabId: string, handle: FileSystemFileHandle) {
  fileHandleStore.set(tabId, handle);
}

export function getFileHandle(tabId: string): FileSystemFileHandle | undefined {
  return fileHandleStore.get(tabId);
}

export function removeFileHandle(tabId: string) {
  fileHandleStore.delete(tabId);
}

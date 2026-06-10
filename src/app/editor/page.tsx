import { EditorPage } from '@/components/editor/editor-page';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ file?: string }>;
}) {
  const params = await searchParams;
  return <EditorPage initialFile={params.file} />;
}

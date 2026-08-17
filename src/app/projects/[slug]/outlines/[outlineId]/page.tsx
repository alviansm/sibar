import { redirect } from 'next/navigation';

interface OutlineManagerProps {
  params: Promise<{ slug: string; outlineId: string }>;
}

export default async function OutlineProblemManagerPage(props: OutlineManagerProps) {
  const params = await props.params;
  redirect(`/projects/${params.slug}/outlines/${params.outlineId}/examples`);
}

import { VerificationDetail } from '@/components/admin/admin-console';
export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  return <VerificationDetail businessId={businessId} />;
}

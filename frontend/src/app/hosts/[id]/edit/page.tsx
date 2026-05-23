import HostForm from '../../new/page';
import { use } from 'react';

export default function EditHost({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const hostId = parseInt(resolvedParams.id);
  return <HostForm hostId={hostId} />;
}
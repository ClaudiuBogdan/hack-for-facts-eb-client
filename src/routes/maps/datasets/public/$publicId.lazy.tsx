import { createLazyFileRoute } from '@tanstack/react-router';
import { AdvancedMapDatasetPublicPage } from '@/features/advanced-map-datasets/components/dataset-public-page';

export const Route = createLazyFileRoute('/maps/datasets/public/$publicId')({
  component: PublicDatasetRouteComponent,
});

function PublicDatasetRouteComponent() {
  const params = Route.useParams();

  return (
    <AdvancedMapDatasetPublicPage publicId={params.publicId} />
  );
}

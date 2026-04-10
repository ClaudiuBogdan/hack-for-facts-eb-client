import { createLazyFileRoute } from '@tanstack/react-router';
import { AdvancedMapDatasetListPage } from '@/features/advanced-map-datasets/components/dataset-list-page';

export const Route = createLazyFileRoute('/maps/datasets/')({
  component: AdvancedMapDatasetListPage,
});

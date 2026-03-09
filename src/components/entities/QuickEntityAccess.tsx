import { useRecentEntities } from '@/hooks/useRecentEntities';
import { PREDEFINED_ENTITIES } from '@/lib/constants/predefined-entities';
import { Badge } from '@/components/ui/badge';
import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { buildPreferredEntityPath } from '@/lib/entity-navigation';

const MAX_SUGGESTIONS = 5;

export function QuickEntityAccess() {
  const { recentEntities } = useRecentEntities();

  const suggestions = [
    ...recentEntities.map(e => ({ ...e, isRecent: true })),
    ...PREDEFINED_ENTITIES.filter(
      p => !recentEntities.some(r => r.cui === p.cui)
    ).map(e => ({ ...e, isRecent: false })),
  ].slice(0, MAX_SUGGESTIONS);

  return (
    <div className="w-full">
      <div className="flex flex-wrap justify-center gap-3 sm:gap-2">
        {suggestions.map((entity, index) => (
          <motion.div
            key={entity.cui}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Link
              to={buildPreferredEntityPath({
                cui: entity.cui,
                entityType: entity.entity_type,
                isUat: entity.is_uat,
              }) as '/'}
              preload="intent"
            >
              <Badge
                variant="outline"
                className="bg-white dark:bg-slate-800 px-3 py-2 sm:px-4 sm:py-2 border-1 border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition duration-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer group"
              >
                <div className="flex flex-row gap-2 items-center justify-between">
                  <span className="text-sm md:text-base whitespace-nowrap text-slate-500 dark:text-slate-300 group-hover:text-black dark:group-hover:text-slate-200 transition-colors">{formatEntityName(entity.name)}</span>
                  <span className="text-xs md:text-sm text-slate-500 dark:text-slate-300 font-mono font-normal group-hover:text-slate-500 dark:group-hover:text-slate-200 transition-colors">
                    [{entity.cui}]
                  </span>
                </div>
              </Badge>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}



const entityNameMap = {
  'municipiul': 'mun.',
  'judetul': 'jud.',
  'ministerul': 'min.',
} as Record<string, string>;


function formatEntityName(name: string) {
  return name.toLocaleLowerCase()
    .split(' ')
    .map(word => entityNameMap[word] || word)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-');
}

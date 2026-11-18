import * as search from './alerts-search';
import type { Alert } from './alerts-search';

export type { Alert, AlertCondition, AlertEditorMode, AlertOperator, AlertUrlState, AlertView } from './alerts-search';

export const AlertOperatorEnum = search.alertOperatorEnum.schema();
export const AlertConditionSchema = search.alertConditionSchema.schema();
export const AlertSchema = search.alertSchema.schema();
export const AlertViewEnum = search.alertViewEnum.schema();
export const AlertEditorModeEnum = search.alertEditorModeEnum.schema();
export const alertUrlStateSchema = search.alertUrlStateSchema.schema();

export function createEmptyAlert(partial?: Partial<Alert>): Alert {
  const base = AlertSchema.parse({});
  if (!partial) {
    return base;
  }

  return AlertSchema.parse({
    ...base,
    ...partial,
  });
}

/**
 * The ONRC lifecycle status codes the hub reads by name.
 *
 * The full nomenclature lives on the server and arrives as labels; these are
 * the ones the page addresses directly, to headline a figure or to build a
 * directory link. Kept here rather than inline so the hub and the directory
 * cannot drift apart on what "active" means.
 */
export const STATUS_ACTIVE = '1048'
export const STATUS_STRUCK_OFF = '1084'
export const STATUS_BANKRUPTCY = '1070'
export const STATUS_INSOLVENCY = '1107'

/**
 * Every status of the insolvency procedure: insolvency, judicial
 * reorganisation, bankruptcy, and the two "under Law 85/2014 / 85/2006"
 * flags. The hub counts these and links them, so the figure and the list agree
 * (`scripts/generate-companies-hub-snapshot.mjs` reads this array).
 */
export const INSOLVENCY_STATUSES = ['1107', '1057', '1139', '1083', '1070']

/** Dissolution in each of its ONRC forms (plain, judicial, by law), and liquidation. */
export const DISSOLUTION_STATUSES = ['1049', '1113', '1120', '1145', '1098', '1109', '1052']

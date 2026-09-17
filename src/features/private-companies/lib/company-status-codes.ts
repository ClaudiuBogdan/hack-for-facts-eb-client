/**
 * The ONRC lifecycle status codes the hub reads by name.
 *
 * The full nomenclature lives on the server and arrives as `statusMix` labels;
 * these four are the ones the page addresses directly, to headline a figure or
 * to build a directory link. Kept here rather than inline so the hub and the
 * directory cannot drift apart on what "active" means.
 */
export const STATUS_ACTIVE = '1048'
export const STATUS_STRUCK_OFF = '1084'
export const STATUS_BANKRUPTCY = '1070'
export const STATUS_INSOLVENCY = '1107'

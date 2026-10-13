/** After a control that leaves with its own answer (a way out of a missing law or ministry): the focus goes to the new question, not to the page. */
export function focusQuestion() {
  document.getElementById('budget-advanced-title')?.focus({ preventScroll: true })
}

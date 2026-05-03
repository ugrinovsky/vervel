/**
 * Маркер для `Screen` pull-to-refresh: жест не начинается, если touchstart попал
 * на элемент с этим атрибутом (`closest('[data-no-pull-refresh]')`).
 *
 * Раскидывайте на ручки @dnd-kit sortable и на корень `useDraggable`, если тащится вся карточка.
 */
export const noPullRefreshProps = { 'data-no-pull-refresh': '' as const };

import type { Modifier } from '@dnd-kit/core';
import type { Transform } from '@dnd-kit/utilities';
import type { SyntheticEvent } from 'react';

/** Только вертикальное смещение при перетаскивании списка упражнений. */
export const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

/**
 * Ограничение по вертикали внутри контейнера списка.
 * Вызывать из модификатора DnD и передавать `container` только из ref внутри колбэка (не при рендере).
 */
export function applyVerticalListBounds(
  transform: Transform,
  draggingNodeRect: { top: number; bottom: number } | null,
  container: HTMLElement | null
): Transform {
  if (!container || !draggingNodeRect) return transform;
  const r = container.getBoundingClientRect();
  const minY = r.top - draggingNodeRect.top;
  const maxY = r.bottom - draggingNodeRect.bottom;
  return {
    ...transform,
    y: Math.min(Math.max(transform.y, minY), maxY),
  };
}

/** Чтобы кнопки в строке между карточками не запускали сенсор dnd-kit. */
export function stopDragSensorBubble(e: SyntheticEvent) {
  e.stopPropagation();
}

import type { Modifier } from '@dnd-kit/core';
import type { SyntheticEvent } from 'react';

/** Только вертикальное смещение при перетаскивании списка упражнений. */
export const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

/** Чтобы кнопки в строке между карточками не запускали сенсор dnd-kit. */
export function stopDragSensorBubble(e: SyntheticEvent) {
  e.stopPropagation();
}

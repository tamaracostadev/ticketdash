import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element &&
    target.closest(
      "a,button,input,select,textarea,label,[role='button'],[data-no-board-drag]",
    ) !== null;
}

export function useHorizontalBoardDrag(enabled: boolean) {
  const dragState = useRef<{
    pointerId: number;
    scrollLeft: number;
    startX: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  return useMemo(() => ({
    className: enabled ? (isDragging ? "cursor-grabbing select-none" : "cursor-grab") : "",
    onPointerDown: enabled
      ? (event: ReactPointerEvent<HTMLDivElement>) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          if (isInteractiveTarget(event.target)) return;
          dragState.current = {
            pointerId: event.pointerId,
            scrollLeft: event.currentTarget.scrollLeft,
            startX: event.clientX,
          };
          setIsDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      : undefined,
    onPointerMove: enabled
      ? (event: ReactPointerEvent<HTMLDivElement>) => {
          const current = dragState.current;
          if (!current || current.pointerId !== event.pointerId) return;
          const delta = event.clientX - current.startX;
          event.currentTarget.scrollLeft = current.scrollLeft - delta;
        }
      : undefined,
    onPointerUp: enabled
      ? (event: ReactPointerEvent<HTMLDivElement>) => {
          if (dragState.current?.pointerId !== event.pointerId) return;
          dragState.current = null;
          setIsDragging(false);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }
      : undefined,
    onPointerCancel: enabled
      ? (event: ReactPointerEvent<HTMLDivElement>) => {
          if (dragState.current?.pointerId !== event.pointerId) return;
          dragState.current = null;
          setIsDragging(false);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }
      : undefined,
  }), [enabled, isDragging]);
}

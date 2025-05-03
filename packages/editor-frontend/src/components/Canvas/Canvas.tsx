// packages/editor-frontend/src/components/Canvas/Canvas.tsx
import React, { useState, useRef, useCallback, useEffect } from "react";
import { useEditorStore } from "../../core/store";
import { DesignElement, ElementId, ElementStyle } from "../../core/types";
// No more styles import
import clsx from "clsx";
import { ResizeHandles } from "./ResizeHandles";
import type { HandleType } from "./ResizeHandles";

// Helper to parse pixel values, returning 0 if invalid
const parsePx = (value: string | number | undefined): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Type for interaction mode
type InteractionMode = "idle" | "dragging" | "resizing";

// Cursor map for resize handles (used for border hover too)
const cursorMap: Record<HandleType, string> = {
  "top-left": "nwse-resize",
  top: "ns-resize",
  "top-right": "nesw-resize",
  left: "ew-resize",
  right: "ew-resize",
  "bottom-left": "nesw-resize",
  bottom: "ns-resize",
  "bottom-right": "nwse-resize",
};

// Install clsx: pnpm add -F editor-frontend clsx
export const Canvas: React.FC = () => {
  const elements = useEditorStore((state) => state.elements);
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const selectedElement = useEditorStore((state) =>
    state.selectedElementId ? state.elements[state.selectedElementId] : null
  );
  const selectElement = useEditorStore((state) => state.selectElement);
  const updateStyle = useEditorStore((state) => state.updateElementStyle);

  // --- Interaction State ---
  const [interactionMode, setInteractionMode] =
    useState<InteractionMode>("idle");
  const interactionStartInfo = useRef<any>(null);
  const [hoveredHandleType, setHoveredHandleType] = useState<HandleType | null>(
    null
  ); // State for border hover detection
  const canvasRef = useRef<HTMLDivElement>(null); // Ref for the canvas div
  const justFinishedInteraction = useRef(false); // Ref flag for click handling

  const interactionMoveHandlerRef = useRef<(event: MouseEvent) => void>();
  const interactionEndHandlerRef = useRef<(event?: MouseEvent) => void>(); // Allow event in ref type

  // --- Define Stable wrapper functions FIRST ---
  const handleWindowMouseMove = useCallback((event: MouseEvent) => {
    interactionMoveHandlerRef.current?.(event);
  }, []); // Empty dependency array makes this stable

  const handleWindowMouseUp = useCallback((event: MouseEvent) => {
    interactionEndHandlerRef.current?.(event);
  }, []); // Empty dependency array makes this stable

  // --- Update refs with the latest handlers ---
  useEffect(() => {
    interactionMoveHandlerRef.current = (event: MouseEvent) => {
      if (interactionMode === "idle" || !interactionStartInfo.current) return;
      console.log("Interaction Move - Mode:", interactionMode);

      if (interactionMode === "dragging") {
        console.log("Interaction Move - Dragging");
        const { elementId, startX, startY, elementStartX, elementStartY } =
          interactionStartInfo.current;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        const newLeft = elementStartX + dx;
        const newTop = elementStartY + dy;

        updateStyle(elementId, {
          left: `${newLeft}px`,
          top: `${newTop}px`,
        });
      } else if (interactionMode === "resizing") {
        console.log("Interaction Move - Resizing");
        const {
          elementId,
          handleType,
          startX,
          startY,
          initialRect,
          aspectRatio,
        } = interactionStartInfo.current;
        let dx = event.clientX - startX;
        let dy = event.clientY - startY;
        const shiftPressed = event.shiftKey;

        let newWidth = initialRect.width;
        let newHeight = initialRect.height;
        let newLeft = initialRect.left;
        let newTop = initialRect.top;

        switch (handleType) {
          case "top-left":
            newWidth = initialRect.width - dx;
            newHeight = initialRect.height - dy;
            if (shiftPressed) {
              const adjustedDx =
                Math.sign(dx) *
                Math.max(Math.abs(dx), Math.abs(dy) * aspectRatio);
              newWidth = initialRect.width - adjustedDx;
              newHeight = newWidth / aspectRatio;
              dy = initialRect.height - newHeight;
            }
            newLeft = initialRect.left + dx;
            newTop = initialRect.top + dy;
            break;
          case "top":
            newHeight = initialRect.height - dy;
            if (shiftPressed) {
              const widthChange = newHeight * aspectRatio - initialRect.width;
              newWidth = initialRect.width + widthChange;
              newLeft = initialRect.left - widthChange / 2;
            } else {
              newWidth = initialRect.width;
              newLeft = initialRect.left;
            }
            newTop = initialRect.top + dy;
            break;
          case "top-right":
            newWidth = initialRect.width + dx;
            newHeight = initialRect.height - dy;
            if (shiftPressed) {
              const adjustedDx =
                Math.sign(dx) *
                Math.max(Math.abs(dx), Math.abs(dy) * aspectRatio);
              newWidth = initialRect.width + adjustedDx;
              newHeight = newWidth / aspectRatio;
              dy = initialRect.height - newHeight;
            }
            newTop = initialRect.top + dy;
            break;
          case "left":
            newWidth = initialRect.width - dx;
            if (shiftPressed) {
              const heightChange = newWidth / aspectRatio - initialRect.height;
              newHeight = initialRect.height + heightChange;
              newTop = initialRect.top - heightChange / 2;
            } else {
              newHeight = initialRect.height;
              newTop = initialRect.top;
            }
            newLeft = initialRect.left + dx;
            break;
          case "right":
            newWidth = initialRect.width + dx;
            if (shiftPressed) {
              const heightChange = newWidth / aspectRatio - initialRect.height;
              newHeight = initialRect.height + heightChange;
              newTop = initialRect.top - heightChange / 2;
            } else {
              newHeight = initialRect.height;
              newTop = initialRect.top;
            }
            break;
          case "bottom-left":
            newWidth = initialRect.width - dx;
            newHeight = initialRect.height + dy;
            if (shiftPressed) {
              const adjustedDx =
                Math.sign(dx) *
                Math.max(Math.abs(dx), Math.abs(dy) * aspectRatio);
              newWidth = initialRect.width - adjustedDx;
              newHeight = newWidth / aspectRatio;
            }
            newLeft = initialRect.left + dx;
            break;
          case "bottom":
            newHeight = initialRect.height + dy;
            if (shiftPressed) {
              const widthChange = newHeight * aspectRatio - initialRect.width;
              newWidth = initialRect.width + widthChange;
              newLeft = initialRect.left - widthChange / 2;
            } else {
              newWidth = initialRect.width;
              newLeft = initialRect.left;
            }
            break;
          case "bottom-right":
            newWidth = initialRect.width + dx;
            newHeight = initialRect.height + dy;
            if (shiftPressed) {
              const adjustedDx =
                Math.sign(dx) *
                Math.max(Math.abs(dx), Math.abs(dy) * aspectRatio);
              newWidth = initialRect.width + adjustedDx;
              newHeight = newWidth / aspectRatio;
            }
            break;
        }

        const minSize = 10;
        if (newWidth < minSize) {
          if (handleType.includes("left")) {
            newLeft += newWidth - minSize;
          }
          newWidth = minSize;
          if (shiftPressed) newHeight = newWidth / aspectRatio;
        }
        if (newHeight < minSize) {
          if (handleType.includes("top")) {
            newTop += newHeight - minSize;
          }
          newHeight = minSize;
          if (shiftPressed) newWidth = newHeight * aspectRatio;
        }
        newWidth = Math.max(minSize, newWidth);
        newHeight = Math.max(minSize, newHeight);

        updateStyle(elementId, {
          width: `${Math.round(newWidth)}px`,
          height: `${Math.round(newHeight)}px`,
          left: `${Math.round(newLeft)}px`,
          top: `${Math.round(newTop)}px`,
        });
      }
    };
  }, [interactionMode, updateStyle]);

  useEffect(() => {
    // Define the core logic for ending interaction
    const endInteractionLogic = (event?: MouseEvent) => {
      if (interactionMode !== "idle") {
        console.log("Interaction End - Mode:", interactionMode);
        const prevMode = interactionMode;
        setInteractionMode("idle");
        interactionStartInfo.current = null;
        window.removeEventListener("mousemove", handleWindowMouseMove);
        window.removeEventListener("mouseup", handleWindowMouseUp);

        event?.stopPropagation();

        if (prevMode === "resizing" || prevMode === "dragging") {
          document.body.style.cursor = "default";
          // Set the flag indicating an interaction just finished
          justFinishedInteraction.current = true;
        }
      }
    };
    // Assign the logic to the ref
    interactionEndHandlerRef.current = endInteractionLogic;

    if (
      interactionMode === "idle" &&
      document.body.style.cursor !== "default"
    ) {
      document.body.style.cursor = "default";
    }
  }, [interactionMode, handleWindowMouseMove, handleWindowMouseUp]);

  // --- Border Hover Detection ---
  const handleCanvasMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (
        interactionMode !== "idle" ||
        !selectedElement ||
        !canvasRef.current
      ) {
        if (hoveredHandleType) {
          setHoveredHandleType(null);
          document.body.style.cursor = "default";
        }
        return;
      }

      const threshold = 6; // Pixels proximity to trigger edge detection
      const rect = canvasRef.current.getBoundingClientRect();
      const style = selectedElement.style;
      const elRect = {
        left: parsePx(style.left),
        top: parsePx(style.top),
        width: parsePx(style.width),
        height: parsePx(style.height),
        right: parsePx(style.left) + parsePx(style.width),
        bottom: parsePx(style.top) + parsePx(style.height),
      };

      const scrollLeft = canvasRef.current.scrollLeft;
      const scrollTop = canvasRef.current.scrollTop;
      const mouseX = event.clientX - rect.left + scrollLeft;
      const mouseY = event.clientY - rect.top + scrollTop;

      let detectedHandle: HandleType | null = null;

      const onLeft = Math.abs(mouseX - elRect.left) < threshold;
      const onRight = Math.abs(mouseX - elRect.right) < threshold;
      const onTop = Math.abs(mouseY - elRect.top) < threshold;
      const onBottom = Math.abs(mouseY - elRect.bottom) < threshold;
      const withinX =
        mouseX > elRect.left - threshold && mouseX < elRect.right + threshold;
      const withinY =
        mouseY > elRect.top - threshold && mouseY < elRect.bottom + threshold;

      if (onTop && onLeft && withinX && withinY) detectedHandle = "top-left";
      else if (onTop && onRight && withinX && withinY)
        detectedHandle = "top-right";
      else if (onBottom && onLeft && withinX && withinY)
        detectedHandle = "bottom-left";
      else if (onBottom && onRight && withinX && withinY)
        detectedHandle = "bottom-right";
      else if (onTop && withinX && withinY) detectedHandle = "top";
      else if (onBottom && withinX && withinY) detectedHandle = "bottom";
      else if (onLeft && withinX && withinY) detectedHandle = "left";
      else if (onRight && withinX && withinY) detectedHandle = "right";

      if (detectedHandle !== hoveredHandleType) {
        setHoveredHandleType(detectedHandle);
        document.body.style.cursor = detectedHandle
          ? cursorMap[detectedHandle]
          : "default";
      }
    },
    [interactionMode, selectedElement, hoveredHandleType]
  );

  // -- Define Resize Start *BEFORE* Drag Start --
  const handleResizeStart = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, handleType: HandleType) => {
      event.stopPropagation(); // Still important here!
      console.log(
        "Resize Start Attempt - Current Mode:",
        interactionMode,
        "Handle:",
        handleType
      );
      if (!selectedElement) return;
      if (hoveredHandleType) {
        setHoveredHandleType(null);
        document.body.style.cursor = "default";
      }

      const style = selectedElement.style;
      const initialRect = {
        width: parsePx(style.width),
        height: parsePx(style.height),
        left: parsePx(style.left),
        top: parsePx(style.top),
      };

      console.log("Resize Start - Handle:", handleType);
      setInteractionMode("resizing");
      interactionStartInfo.current = {
        elementId: selectedElement.id,
        handleType: handleType,
        startX: event.clientX,
        startY: event.clientY,
        initialRect,
        aspectRatio: initialRect.width / initialRect.height || 1,
      };

      window.addEventListener("mousemove", handleWindowMouseMove);
      window.addEventListener("mouseup", handleWindowMouseUp);
    },
    [
      interactionMode,
      selectedElement,
      handleWindowMouseMove,
      handleWindowMouseUp,
      hoveredHandleType,
    ]
  );

  // Drag Start Handler - Modified to check for border hover first
  const handleDragStart = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, id: ElementId) => {
      if (hoveredHandleType) {
        console.log(
          "Mouse down on border/handle, initiating resize:",
          hoveredHandleType
        );
        handleResizeStart(event, hoveredHandleType);
        return;
      }

      event.stopPropagation();
      console.log("Drag Start Attempt - Current Mode:", interactionMode);
      if (interactionMode !== "idle") return;

      const element = elements[id];
      if (!element || element.style.position !== "absolute") {
        console.warn(
          "Dragging only supported for absolutely positioned elements."
        );
        return;
      }

      console.log("Drag Start - Element:", id);
      if (selectedElementId !== id) {
        selectElement(id);
      }

      setInteractionMode("dragging");
      interactionStartInfo.current = {
        elementId: id,
        startX: event.clientX,
        startY: event.clientY,
        elementStartX: parsePx(element.style.left),
        elementStartY: parsePx(element.style.top),
      };

      window.addEventListener("mousemove", handleWindowMouseMove);
      window.addEventListener("mouseup", handleWindowMouseUp);
    },
    [
      interactionMode,
      elements,
      selectedElementId,
      selectElement,
      handleWindowMouseMove,
      handleWindowMouseUp,
      hoveredHandleType,
      handleResizeStart,
    ]
  );

  const handleCanvasClick = useCallback(() => {
    // If a drag/resize just finished, ignore this click and reset the flag
    if (justFinishedInteraction.current) {
      justFinishedInteraction.current = false;
      return;
    }

    console.log("Canvas Click - Current Mode:", interactionMode);
    if (interactionMode === "idle") {
      selectElement(null);
      if (hoveredHandleType) {
        setHoveredHandleType(null);
        document.body.style.cursor = "default";
      }
    }
  }, [interactionMode, selectElement, hoveredHandleType]);

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [handleWindowMouseMove, handleWindowMouseUp]);

  const elementList = Object.values(elements);

  // Example checkered background using Tailwind's background utilities
  const checkeredBg = `
        bg-gray-100
        [background-image:linear-gradient(45deg,_#e0e0e0_25%,_transparent_25%,_transparent_75%,_#e0e0e0_75%,_#e0e0e0),_linear-gradient(45deg,_#e0e0e0_25%,_transparent_25%,_transparent_75%,_#e0e0e0_75%,_#e0e0e0)]
        [background-size:20px_20px]
        [background-position:0_0,_10px_10px]
    `;

  return (
    <div
      ref={canvasRef}
      className={clsx("relative w-full h-full overflow-auto", checkeredBg)}
      onClick={handleCanvasClick}
      onMouseMove={handleCanvasMouseMove}
    >
      {elementList.map((element: DesignElement) => (
        <div
          key={element.id}
          className={clsx(
            "box-border absolute pointer-events-auto",
            selectedElementId !== element.id &&
              interactionMode === "idle" &&
              "hover:outline hover:outline-1 hover:outline-blue-400",
            selectedElementId === element.id &&
              "outline outline-2 outline-blue-600",
            interactionMode === "idle" && !hoveredHandleType && "cursor-grab",
            "select-none"
          )}
          style={element.style}
          onMouseDown={(e) => handleDragStart(e, element.id)}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Element Content Area */}
        </div>
      ))}
      {selectedElement &&
        (interactionMode === "idle" || interactionMode === "resizing") && (
          <ResizeHandles
            element={selectedElement}
            onResizeStart={handleResizeStart}
          />
        )}
    </div>
  );
};

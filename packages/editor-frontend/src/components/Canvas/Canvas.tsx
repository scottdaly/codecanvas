// packages/editor-frontend/src/components/Canvas/Canvas.tsx
import React, { useState, useRef, useCallback, useEffect } from "react";
import { useEditorStore } from "../../core/store";
import { DesignElement, ElementId } from "../../core/types";
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
  // Get interaction actions
  const startInteraction = useEditorStore((state) => state.startInteraction);
  const endInteraction = useEditorStore((state) => state.endInteraction);

  // --- Interaction State ---
  const [interactionMode, setInteractionMode] =
    useState<InteractionMode>("idle");
  const interactionStartInfo = useRef<any>(null);
  const [hoveredHandleType, setHoveredHandleType] = useState<HandleType | null>(
    null
  ); // State for border hover detection
  const canvasRef = useRef<HTMLDivElement>(null); // Ref for the canvas div
  const justFinishedInteraction = useRef(false); // Ref flag for click handling

  const interactionMoveHandlerRef = useRef<
    ((event: MouseEvent) => void) | null
  >(null);
  const interactionEndHandlerRef = useRef<
    ((event?: MouseEvent) => void) | null
  >(null); // Allow event in ref type

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
        // Signal interaction end to the store *before* resetting local state
        endInteraction();

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
  }, [
    interactionMode,
    handleWindowMouseMove,
    handleWindowMouseUp,
    endInteraction, // Add endInteraction to dependencies
  ]);

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
    [
      interactionMode,
      selectedElement,
      hoveredHandleType,
      startInteraction, // Add startInteraction to dependencies
    ]
  );

  // -- Define Resize Start *BEFORE* Drag Start --
  const handleResizeStart = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, handleType: HandleType) => {
      // No need to stop propagation here anymore, canvas handler did it
      // event.stopPropagation();

      // Check selectedElement directly, as ID isn't passed
      if (!selectedElement || interactionMode !== "idle") {
        console.warn("Resize start condition not met", {
          selectedElement,
          interactionMode,
        });
        return;
      }

      console.log(
        "Resize Start - Handle:",
        handleType,
        "Mode:",
        interactionMode
      );

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

      setInteractionMode("resizing");
      startInteraction();

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
      startInteraction, // Add startInteraction to dependencies
    ]
  );

  // Drag Start Handler - Now responsible for detecting resize OR drag
  const handleDragStart = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, id: ElementId) => {
      // Stop propagation is now handled by the caller (handleCanvasMouseDown)
      // event.stopPropagation();
      console.log(
        "Drag Start (from Canvas handler) - Element:",
        id,
        "Mode:",
        interactionMode
      );

      if (interactionMode !== "idle") return;

      const element = elements[id];
      if (!element || element.style.position !== "absolute") {
        console.warn(
          "Dragging only supported for absolutely positioned elements."
        );
        return;
      }

      // Selection logic might happen *before* this is called now,
      // but double-check just in case.
      if (selectedElementId !== id) {
        selectElement(id);
      }

      setInteractionMode("dragging");
      startInteraction(); // Signal interaction start

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
      handleResizeStart, // Keep for delegation
      startInteraction,
      canvasRef, // Add canvasRef back as dependency
    ]
  );

  const handleCanvasClick = useCallback(() => {
    // If a drag/resize just finished, ignore this click and reset the flag
    if (justFinishedInteraction.current) {
      justFinishedInteraction.current = false;
      return;
    }

    // This logic is now mostly handled by handleCanvasMouseDown deciding not to drag/resize
    console.log(
      "Canvas Click (for deselection) - Current Mode:",
      interactionMode
    );
    if (interactionMode === "idle") {
      selectElement(null);
      if (hoveredHandleType) {
        setHoveredHandleType(null);
        document.body.style.cursor = "default";
      }
    }
  }, [
    interactionMode,
    selectElement,
    hoveredHandleType,
    justFinishedInteraction,
  ]);

  // --- NEW: Centralized MouseDown Handler for Canvas ---
  const handleCanvasMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Prevent default browser drag behavior if needed
      // event.preventDefault();

      // Ignore if not left click
      if (event.button !== 0) return;

      if (!canvasRef.current) return;

      // Calculate click coordinates relative to the scrolled canvas
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const scrollLeft = canvasRef.current.scrollLeft;
      const scrollTop = canvasRef.current.scrollTop;
      const mouseX = event.clientX - canvasRect.left + scrollLeft;
      const mouseY = event.clientY - canvasRect.top + scrollTop;

      let targetElement: DesignElement | null = null;
      let detectedHandle: HandleType | null = null;
      const threshold = 6; // Keep threshold for edge detection

      // Iterate over elements to find which one was clicked (if any)
      // Iterate in reverse order so topmost elements are checked first
      const elementsToCheck = Object.values(elements).reverse();
      for (const element of elementsToCheck) {
        const style = element.style;
        const elRect = {
          left: parsePx(style.left),
          top: parsePx(style.top),
          width: parsePx(style.width),
          height: parsePx(style.height),
          right: parsePx(style.left) + parsePx(style.width),
          bottom: parsePx(style.top) + parsePx(style.height),
        };

        // Check if click is within the element's threshold area
        const withinXThreshold =
          mouseX >= elRect.left - threshold &&
          mouseX <= elRect.right + threshold;
        const withinYThreshold =
          mouseY >= elRect.top - threshold &&
          mouseY <= elRect.bottom + threshold;

        if (withinXThreshold && withinYThreshold) {
          targetElement = element; // Found the potential target element
          detectedHandle = null; // Reset for this element

          // Determine handle type based purely on proximity to edges/corners within threshold
          const onLeft = Math.abs(mouseX - elRect.left) < threshold;
          const onRight = Math.abs(mouseX - elRect.right) < threshold;
          const onTop = Math.abs(mouseY - elRect.top) < threshold;
          const onBottom = Math.abs(mouseY - elRect.bottom) < threshold;

          // Corner detection (priority)
          if (onTop && onLeft) detectedHandle = "top-left";
          else if (onTop && onRight) detectedHandle = "top-right";
          else if (onBottom && onLeft) detectedHandle = "bottom-left";
          else if (onBottom && onRight) detectedHandle = "bottom-right";
          // Edge detection (use bounds check for opposite axis)
          else if (onTop) detectedHandle = "top";
          else if (onBottom) detectedHandle = "bottom";
          else if (onLeft) detectedHandle = "left";
          else if (onRight) detectedHandle = "right";

          break; // Stop checking other elements once the target is found
        }
      }

      // --- Decide action based on findings --- //

      if (targetElement) {
        // Select the target element if it's not already selected
        if (selectedElementId !== targetElement.id) {
          selectElement(targetElement.id);
        }

        // Prevent click from deselecting via handleCanvasClick
        event.stopPropagation();

        if (detectedHandle) {
          // Initiate Resize
          console.log(
            "Canvas MouseDown starting RESIZE for",
            targetElement.id,
            "handle:",
            detectedHandle
          );
          handleResizeStart(event, detectedHandle);
        } else {
          // Initiate Drag
          console.log("Canvas MouseDown starting DRAG for", targetElement.id);
          handleDragStart(event, targetElement.id);
        }
      } else {
        // Click was on the background, deselect
        console.log("Canvas MouseDown on background, deselecting.");
        if (selectedElementId !== null) {
          selectElement(null);
        }
        // Do not stop propagation, allow potential canvas background actions?
        // Or maybe stop it if we are sure deselection is the only goal?
      }
    },
    [
      selectedElementId, // Need current selection ID to compare
      elements, // Need elements map if handleDragStart uses it internally
      interactionMode, // Check interactionMode in resize/drag starts
      canvasRef,
      handleResizeStart,
      handleDragStart,
      selectElement, // Need to call selectElement
    ]
  );

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
      onClick={handleCanvasClick} // Keep for explicit deselection clicks
      onMouseMove={handleCanvasMouseMove}
      onMouseDown={handleCanvasMouseDown} // NEW: Attach main handler here
    >
      {elementList.map((element: DesignElement) => (
        <div
          key={element.id}
          className={clsx(
            "box-border absolute pointer-events-auto", // Keep pointer-events-auto for rendering, but mousedown is handled by canvas
            selectedElementId !== element.id &&
              interactionMode === "idle" &&
              "hover:outline hover:outline-1 hover:outline-blue-400",
            selectedElementId === element.id &&
              "outline outline-2 outline-blue-600",
            interactionMode === "idle" && "cursor-grab", // Default to grab if idle
            "select-none"
          )}
          style={element.style}
          onClick={(e) => e.stopPropagation()} // Keep stopping click prop for selection mgmt
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

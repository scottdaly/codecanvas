// packages/editor-frontend/src/components/Canvas/ResizeHandles.tsx
import React from "react";
import { DesignElement } from "../../core/types";

export type HandleType =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

interface ResizeHandlesProps {
  element: DesignElement;
  onResizeStart: (
    event: React.MouseEvent<HTMLDivElement>,
    handleType: HandleType
  ) => void;
}

// Basic handle styles - adjust size/appearance as needed
const handleBaseClasses =
  "absolute w-3 h-3 border border-blue-700 bg-white rounded-sm";

// Cursor styles based on handle type
const cursorMap: Record<HandleType, string> = {
  "top-left": "cursor-nwse-resize",
  top: "cursor-ns-resize",
  "top-right": "cursor-nesw-resize",
  left: "cursor-ew-resize",
  right: "cursor-ew-resize",
  "bottom-left": "cursor-nesw-resize",
  bottom: "cursor-ns-resize",
  "bottom-right": "cursor-nwse-resize",
};

// Position styles revised for consistent centering
const positionMap: Record<HandleType, string> = {
  "top-left": "top-0    left-0    -translate-x-1/2 -translate-y-1/2", // Center at (0, 0)
  top: "top-0    left-1/2  -translate-x-1/2 -translate-y-1/2", // Center at (50%, 0)
  "top-right": "top-0    left-full -translate-x-1/2 -translate-y-1/2", // Center at (100%, 0)
  left: "top-1/2  left-0    -translate-x-1/2 -translate-y-1/2", // Center at (0, 50%)
  right: "top-1/2  left-full -translate-x-1/2 -translate-y-1/2", // Center at (100%, 50%)
  "bottom-left": "top-full left-0    -translate-x-1/2 -translate-y-1/2", // Center at (0, 100%)
  bottom: "top-full left-1/2  -translate-x-1/2 -translate-y-1/2", // Center at (50%, 100%)
  "bottom-right": "top-full left-full -translate-x-1/2 -translate-y-1/2", // Center at (100%, 100%)
};

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({
  element,
  onResizeStart,
}) => {
  // Only render corner handles
  const handles: HandleType[] = [
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
  ];

  // Ensure styles are applied directly for the container to position handles correctly
  const containerStyle = {
    ...element.style,
    // Override potential transform if element uses it, handles need clean positioning
    transform: undefined,
    outline: "none", // Don't show the selection outline on the handle container itself
  };

  return (
    // Container positioned exactly like the element to place handles relative to it
    <div
      className="absolute pointer-events-none" // Prevents interfering with element click/drag
      style={containerStyle}
    >
      {handles.map((type) => (
        <div
          key={type}
          className={`${handleBaseClasses} ${cursorMap[type]} ${positionMap[type]}`} // Purely visual, remove pointer-events-auto
          data-handle-type={type}
          // onMouseDown handler removed - detection is centralized in Canvas handleDragStart
        />
      ))}
    </div>
  );
};

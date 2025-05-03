// packages/editor-frontend/src/components/PropertiesPanel/PropertiesPanel.tsx
import React from "react";
import { useEditorStore } from "../../core/store";
import { ElementStyle } from "../../core/types";
// No more styles import

export const PropertiesPanel: React.FC = () => {
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const selectedElement = useEditorStore((state) =>
    state.selectedElementId ? state.elements[state.selectedElementId] : null
  );
  const updateStyle = useEditorStore((state) => state.updateElementStyle);

  const handleStyleChange = (
    property: keyof ElementStyle,
    value: string | number
  ) => {
    if (selectedElementId) {
      const processedValue =
        typeof value === "number" &&
        (property === "width" ||
          property === "height" ||
          property === "left" ||
          property === "top")
          ? `${value}px`
          : value;
      updateStyle(selectedElementId, { [property]: processedValue });
    }
  };

  // Helper to safely get style values
  const getStyleValue = (
    prop: keyof ElementStyle,
    defaultValue: string | number = ""
  ): string | number => {
    const value = selectedElement?.style?.[prop];
    if (value === undefined || value === null) return defaultValue;
    if (
      typeof value === "string" &&
      (prop === "width" ||
        prop === "height" ||
        prop === "left" ||
        prop === "top")
    ) {
      const num = parseInt(value, 10);
      return isNaN(num) ? defaultValue : num;
    }
    return value;
  };

  if (!selectedElement) {
    return (
      <div className="p-4 text-sm text-gray-600">Select an element to edit</div>
    );
  }

  return (
    // Use Tailwind classes for layout and styling
    <div className="p-4 h-full overflow-y-auto">
      <h3 className="text-sm font-semibold mb-4 pb-2 border-b border-gray-200">
        Properties: {selectedElement.name}
      </h3>
      {/* Position & Size Group */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2 text-xs">
          <label className="text-gray-600 w-1/2">Width</label>
          <input
            type="number"
            className="w-1/2 p-1 border border-gray-300 rounded text-xs" // Add form styling
            value={getStyleValue("width", 100)}
            onChange={(e) => handleStyleChange("width", e.target.valueAsNumber)}
          />
        </div>
        <div className="flex items-center justify-between mb-2 text-xs">
          <label className="text-gray-600 w-1/2">Height</label>
          <input
            type="number"
            className="w-1/2 p-1 border border-gray-300 rounded text-xs"
            value={getStyleValue("height", 100)}
            onChange={(e) =>
              handleStyleChange("height", e.target.valueAsNumber)
            }
          />
        </div>
        <div className="flex items-center justify-between mb-2 text-xs">
          <label className="text-gray-600 w-1/2">Left</label>
          <input
            type="number"
            className="w-1/2 p-1 border border-gray-300 rounded text-xs"
            value={getStyleValue("left", 50)}
            onChange={(e) => handleStyleChange("left", e.target.valueAsNumber)}
          />
        </div>
        <div className="flex items-center justify-between mb-2 text-xs">
          <label className="text-gray-600 w-1/2">Top</label>
          <input
            type="number"
            className="w-1/2 p-1 border border-gray-300 rounded text-xs"
            value={getStyleValue("top", 50)}
            onChange={(e) => handleStyleChange("top", e.target.valueAsNumber)}
          />
        </div>
      </div>
      {/* Appearance Group */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2 text-xs">
          <label className="text-gray-600">Background</label>
          <input
            type="color"
            // Tailwind doesn't style color inputs much by default
            className="border border-gray-300 rounded h-6 w-10 p-0" // Basic size/border
            value={getStyleValue("backgroundColor", "#ffffff")}
            onChange={(e) =>
              handleStyleChange("backgroundColor", e.target.value)
            }
          />
        </div>
      </div>
      {/* Add more property groups (border, padding etc) */}
    </div>
  );
};

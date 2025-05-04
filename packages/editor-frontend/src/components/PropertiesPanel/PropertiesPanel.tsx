// packages/editor-frontend/src/components/PropertiesPanel/PropertiesPanel.tsx
import React from "react";
import { useEditorStore } from "../../core/store";
import { ElementStyle } from "../../core/types";
// No more styles import

// --- Constants for Select Options ---
const BORDER_STYLES = ["solid", "dashed", "dotted", "double", "none"];
const FONT_WEIGHTS = [
  "normal",
  "bold",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
];
const TEXT_ALIGNS = ["left", "center", "right", "justify"];
const FLEX_DIRECTIONS: ElementStyle["flexDirection"][] = [
  "row",
  "column",
  "row-reverse",
  "column-reverse",
];
const ALIGN_ITEMS_OPTIONS: ElementStyle["alignItems"][] = [
  "stretch",
  "flex-start",
  "center",
  "flex-end",
  "baseline",
];
const JUSTIFY_CONTENT_OPTIONS: ElementStyle["justifyContent"][] = [
  "flex-start",
  "center",
  "flex-end",
  "space-between",
  "space-around",
  "space-evenly",
];
// ---

export const PropertiesPanel: React.FC = () => {
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const selectedElement = useEditorStore((state) =>
    state.selectedElementId ? state.elements[state.selectedElementId] : null
  );
  const updateStyle = useEditorStore((state) => state.updateElementStyle);
  const deleteElement = useEditorStore((state) => state.deleteElement);

  // Properties that expect a number input but are stored as px strings
  const numericPxProps: (keyof ElementStyle)[] = [
    "width",
    "height",
    "left",
    "top",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "borderWidth",
    "borderRadius",
    "fontSize",
    "gap",
  ];

  const handleStyleChange = (
    property: keyof ElementStyle,
    value: string | number
  ) => {
    if (selectedElementId) {
      // Append 'px' if it's a numeric property and the value is a number
      const processedValue =
        typeof value === "number" && numericPxProps.includes(property)
          ? `${value}px`
          : value;
      updateStyle(selectedElementId, { [property]: processedValue });
    }
  };

  // Helper to safely get style values for inputs
  const getStyleValue = (
    prop: keyof ElementStyle,
    defaultValue: string | number = ""
  ): string | number => {
    const value = selectedElement?.style?.[prop];
    if (value === undefined || value === null) return defaultValue;

    // If it's a property expected to be numeric (stored as px string), parse it
    if (typeof value === "string" && numericPxProps.includes(prop)) {
      const num = parseInt(value, 10);
      return isNaN(num) ? defaultValue : num; // Return number for the input
    }

    // For other properties (like color, borderStyle), return the string value directly
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
          <label className="text-gray-600 w-1/3">Background</label>
          <input
            type="color"
            className="border border-gray-300 rounded h-6 w-10 p-0 ml-auto" // Use ml-auto to push to right
            value={getStyleValue("backgroundColor", "#ffffff")}
            onChange={(e) =>
              handleStyleChange("backgroundColor", e.target.value)
            }
          />
        </div>
      </div>

      {/* --- Spacing Group --- */}
      <div className="mb-3 pt-2 border-t border-gray-100">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Spacing</h4>
        {/* Padding */}
        <div className="grid grid-cols-4 gap-1 mb-2">
          <label className="col-span-4 text-xs text-gray-500">Padding</label>
          {["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"].map(
            (prop) => (
              <input
                key={prop}
                type="number"
                title={prop}
                placeholder={prop.substring(7, 8)} // T, R, B, L
                className="w-full p-1 border border-gray-300 rounded text-xs text-center"
                value={getStyleValue(prop as keyof ElementStyle, 0)}
                onChange={(e) =>
                  handleStyleChange(
                    prop as keyof ElementStyle,
                    e.target.valueAsNumber
                  )
                }
              />
            )
          )}
        </div>
        {/* Margin */}
        <div className="grid grid-cols-4 gap-1">
          <label className="col-span-4 text-xs text-gray-500">Margin</label>
          {["marginTop", "marginRight", "marginBottom", "marginLeft"].map(
            (prop) => (
              <input
                key={prop}
                type="number"
                title={prop}
                placeholder={prop.substring(6, 7)} // T, R, B, L
                className="w-full p-1 border border-gray-300 rounded text-xs text-center"
                value={getStyleValue(prop as keyof ElementStyle, 0)}
                onChange={(e) =>
                  handleStyleChange(
                    prop as keyof ElementStyle,
                    e.target.valueAsNumber
                  )
                }
              />
            )
          )}
        </div>
      </div>

      {/* --- Border Group --- */}
      <div className="mb-3 pt-2 border-t border-gray-100">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Border</h4>
        <div className="flex items-center justify-between mb-2 text-xs space-x-1">
          {/* Width */}
          <div className="flex flex-col items-center w-1/4">
            <label className="text-gray-500 mb-1">W</label>
            <input
              type="number"
              title="Border Width"
              className="w-full p-1 border border-gray-300 rounded text-xs text-center"
              value={getStyleValue("borderWidth", 0)}
              onChange={(e) =>
                handleStyleChange("borderWidth", e.target.valueAsNumber)
              }
            />
          </div>
          {/* Style */}
          <div className="flex flex-col items-center flex-grow">
            <label className="text-gray-500 mb-1">Style</label>
            <select
              title="Border Style"
              className="w-full p-1 border border-gray-300 rounded text-xs bg-white"
              value={getStyleValue("borderStyle", "none")}
              onChange={(e) => handleStyleChange("borderStyle", e.target.value)}
            >
              {BORDER_STYLES.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>
          {/* Color */}
          <div className="flex flex-col items-center">
            <label className="text-gray-500 mb-1">Color</label>
            <input
              type="color"
              title="Border Color"
              className="border border-gray-300 rounded h-6 w-8 p-0"
              value={getStyleValue("borderColor", "#000000")}
              onChange={(e) => handleStyleChange("borderColor", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* --- Corners Group --- */}
      <div className="mb-3 pt-2 border-t border-gray-100">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Corners</h4>
        <div className="flex items-center justify-between mb-2 text-xs">
          <label className="text-gray-600">Radius</label>
          <input
            type="number"
            className="w-1/2 p-1 border border-gray-300 rounded text-xs"
            value={getStyleValue("borderRadius", 0)}
            onChange={(e) =>
              handleStyleChange("borderRadius", e.target.valueAsNumber)
            }
          />
        </div>
      </div>

      {/* --- Typography Group --- */}
      <div className="mb-3 pt-2 border-t border-gray-100">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Typography</h4>
        {/* Size & Weight */}
        <div className="flex items-center justify-between mb-2 text-xs space-x-2">
          <label className="text-gray-600">Size</label>
          <input
            type="number"
            className="flex-grow p-1 border border-gray-300 rounded text-xs"
            value={getStyleValue("fontSize", 16)}
            onChange={(e) =>
              handleStyleChange("fontSize", e.target.valueAsNumber)
            }
          />
          <label className="text-gray-600">Weight</label>
          <select
            className="flex-grow p-1 border border-gray-300 rounded text-xs bg-white"
            value={getStyleValue("fontWeight", "normal")}
            onChange={(e) => handleStyleChange("fontWeight", e.target.value)}
          >
            {FONT_WEIGHTS.map((weight) => (
              <option key={weight} value={weight}>
                {weight}
              </option>
            ))}
          </select>
        </div>
        {/* Color & Align */}
        <div className="flex items-center justify-between mb-2 text-xs space-x-2">
          <label className="text-gray-600">Color</label>
          <input
            type="color"
            className="border border-gray-300 rounded h-6 w-8 p-0"
            value={getStyleValue("color", "#000000")}
            onChange={(e) => handleStyleChange("color", e.target.value)}
          />
          <label className="text-gray-600 ml-2">Align</label>
          <select
            className="flex-grow p-1 border border-gray-300 rounded text-xs bg-white"
            value={getStyleValue("textAlign", "left")}
            onChange={(e) => handleStyleChange("textAlign", e.target.value)}
          >
            {TEXT_ALIGNS.map((align) => (
              <option key={align} value={align}>
                {align}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* --- Flexbox Layout Group --- */}
      <div className="mb-3 pt-2 border-t border-gray-100">
        <h4 className="text-xs font-medium text-gray-700 mb-2">
          Flexbox Layout
        </h4>
        {/* Enable Flexbox Toggle */}
        <div className="flex items-center justify-between mb-2 text-xs">
          <label htmlFor="flex-toggle" className="text-gray-600">
            Enable Flexbox
          </label>
          <input
            id="flex-toggle"
            type="checkbox"
            className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={getStyleValue("display") === "flex"}
            onChange={
              (e) =>
                handleStyleChange(
                  "display",
                  e.target.checked ? "flex" : "block"
                ) // Or 'inline-block' or remove? Default 'block' for now
            }
          />
        </div>

        {/* Conditional Flex Properties */}
        {getStyleValue("display") === "flex" && (
          <div className="space-y-2 mt-2">
            {/* Direction */}
            <div className="flex items-center justify-between text-xs">
              <label className="text-gray-600 w-1/3">Direction</label>
              <select
                className="w-2/3 p-1 border border-gray-300 rounded text-xs bg-white"
                value={getStyleValue("flexDirection", "row")}
                onChange={(e) =>
                  handleStyleChange("flexDirection", e.target.value)
                }
              >
                {FLEX_DIRECTIONS.map((dir) => (
                  <option key={dir} value={dir}>
                    {dir}
                  </option>
                ))}
              </select>
            </div>
            {/* Align Items */}
            <div className="flex items-center justify-between text-xs">
              <label className="text-gray-600 w-1/3">Align Items</label>
              <select
                className="w-2/3 p-1 border border-gray-300 rounded text-xs bg-white"
                value={getStyleValue("alignItems", "stretch")}
                onChange={(e) =>
                  handleStyleChange("alignItems", e.target.value)
                }
              >
                {ALIGN_ITEMS_OPTIONS.map((align) => (
                  <option key={align} value={align}>
                    {align}
                  </option>
                ))}
              </select>
            </div>
            {/* Justify Content */}
            <div className="flex items-center justify-between text-xs">
              <label className="text-gray-600 w-1/3">Justify</label>
              <select
                className="w-2/3 p-1 border border-gray-300 rounded text-xs bg-white"
                value={getStyleValue("justifyContent", "flex-start")}
                onChange={(e) =>
                  handleStyleChange("justifyContent", e.target.value)
                }
              >
                {JUSTIFY_CONTENT_OPTIONS.map((justify) => (
                  <option key={justify} value={justify}>
                    {justify}
                  </option>
                ))}
              </select>
            </div>
            {/* Gap */}
            <div className="flex items-center justify-between text-xs">
              <label className="text-gray-600 w-1/3">Gap (px)</label>
              <input
                type="number"
                className="w-2/3 p-1 border border-gray-300 rounded text-xs"
                value={getStyleValue("gap", 0)} // Use getStyleValue which handles 'px'
                onChange={(e) =>
                  handleStyleChange("gap", e.target.valueAsNumber)
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Delete Button */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          className="w-full bg-red-500 hover:bg-red-700 text-white text-sm py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => {
            if (selectedElementId) {
              deleteElement(selectedElementId);
            }
          }}
          disabled={!selectedElementId}
        >
          Delete Element
        </button>
      </div>
    </div>
  );
};

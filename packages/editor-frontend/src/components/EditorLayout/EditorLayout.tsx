// packages/editor-frontend/src/components/EditorLayout/EditorLayout.tsx
import React from "react";
import { Canvas } from "../Canvas/Canvas";
import { PropertiesPanel } from "../PropertiesPanel/PropertiesPanel";
// No more styles import
import { createDefaultDiv } from "../../core/store";

export const EditorLayout: React.FC = () => {
  return (
    // Use Tailwind classes for layout
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* Toolbar */}
      <div className="flex-shrink-0 h-10 px-4 bg-gray-200 border-b border-gray-300 flex items-center">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white text-sm py-1 px-3 rounded mr-2"
          onClick={createDefaultDiv}
        >
          Add Div
        </button>
        {/* More tools later */}
      </div>
      {/* Main Area */}
      <div className="flex flex-grow h-[calc(100%-40px)]">
        {" "}
        {/* Adjusted height */}
        {/* Add Layers Panel later maybe */}
        {/* <div className="flex-shrink-0 w-52 bg-gray-100 border-r border-gray-300">Layers</div> */}
        {/* Canvas Wrapper */}
        <div className="flex-grow h-full flex flex-col">
          {" "}
          {/* Ensure canvas can fill */}
          <Canvas />
        </div>
        {/* Right Panel Wrapper */}
        <div className="flex-shrink-0 w-64 h-full bg-gray-50">
          {" "}
          {/* width ~250px */}
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
};

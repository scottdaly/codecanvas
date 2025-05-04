// packages/editor-frontend/src/components/EditorLayout/EditorLayout.tsx
import React, { useEffect } from "react";
import { Canvas } from "../Canvas/Canvas";
import { PropertiesPanel } from "../PropertiesPanel/PropertiesPanel";
import { LayersPanel } from "../LayersPanel/LayersPanel";
// No more styles import
import { createDefaultDiv, useEditorStore } from "../../core/store";

// Get the type of the store's state
// No longer needed here if we use useStore directly
// type EditorState = ReturnType<typeof useEditorStore["getState"]>;

export const EditorLayout: React.FC = () => {
  // Select state pieces individually
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const deleteElement = useEditorStore((state) => state.deleteElement);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canUndo = useEditorStore((state) => state.canUndo);
  const canRedo = useEditorStore((state) => state.canRedo);

  // Effect for global keydown listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      // Ignore if typing in an input, textarea, or contenteditable element
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Handle Undo/Redo shortcuts
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const undoPressed =
        (isMac && event.metaKey && event.key === "z" && !event.shiftKey) ||
        (!isMac && event.ctrlKey && event.key === "z" && !event.shiftKey);
      const redoPressed =
        (isMac && event.metaKey && event.shiftKey && event.key === "z") ||
        (!isMac &&
          event.ctrlKey &&
          (event.key === "y" || (event.shiftKey && event.key === "z")));

      if (undoPressed) {
        event.preventDefault(); // Prevent browser undo
        if (canUndo) undo();
        return;
      }
      if (redoPressed) {
        event.preventDefault(); // Prevent browser redo
        if (canRedo) redo();
        return;
      }

      // Handle Delete
      if (
        selectedElementId &&
        (event.key === "Delete" || event.key === "Backspace")
      ) {
        deleteElement(selectedElementId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedElementId, deleteElement, undo, redo, canUndo, canRedo]); // Add history state/actions to dependencies

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
        {/* Undo Button */}
        <button
          className="bg-gray-500 hover:bg-gray-700 text-white text-sm py-1 px-3 rounded mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z / Cmd+Z)"
        >
          Undo
        </button>
        {/* Redo Button */}
        <button
          className="bg-gray-500 hover:bg-gray-700 text-white text-sm py-1 px-3 rounded mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y / Cmd+Shift+Z)"
        >
          Redo
        </button>
        {/* More tools later */}
      </div>
      {/* Main Area */}
      <div className="flex flex-grow h-[calc(100%-40px)]">
        {/* Layers Panel */}
        <div className="flex-shrink-0 w-52 h-full">
          <LayersPanel />
        </div>

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

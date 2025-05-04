import React from "react";
import { useEditorStore } from "../../core/store";
import { LayerItem } from "./LayerItem";

export const LayersPanel: React.FC = () => {
  const rootElementOrder = useEditorStore((state) => state.rootElementOrder);
  const setParent = useEditorStore((state) => state.setParent);
  const elements = useEditorStore((state) => state.elements);

  const handleRootDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleRootDragLeave = (e: React.DragEvent<HTMLDivElement>) => {};

  const handleRootDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId) return;

    const draggedElement = elements[draggedId];

    if (draggedElement && draggedElement.parentId !== null) {
      console.log(`Unnesting ${draggedId} by dropping onto root container.`);
      setParent(draggedId, null);
    }
  };

  return (
    <div className="h-full w-full bg-gray-100 border-r border-gray-300 flex flex-col">
      <div className="flex-shrink-0 h-8 px-3 flex items-center bg-gray-200 border-b border-gray-300">
        <h3 className="text-xs font-semibold text-gray-700">Layers</h3>
      </div>

      <div
        className="flex-grow overflow-y-auto p-1"
        onDragOver={handleRootDragOver}
        onDrop={handleRootDrop}
        onDragLeave={handleRootDragLeave}
      >
        {rootElementOrder.length === 0 && (
          <div className="text-xs text-gray-500 p-2">
            No elements added yet.
          </div>
        )}
        {rootElementOrder.map((id) => (
          <LayerItem key={id} elementId={id} depth={0} />
        ))}
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from "react";
import { useEditorStore } from "../../core/store";
import { ElementId } from "../../core/types";
import clsx from "clsx";

export const LayersPanel: React.FC = () => {
  const elements = useEditorStore((state) => state.elements);
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const selectElement = useEditorStore((state) => state.selectElement);
  const updateElementName = useEditorStore((state) => state.updateElementName);

  const [editingElementId, setEditingElementId] = useState<ElementId | null>(
    null
  );
  const [editingName, setEditingName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const elementList = Object.values(elements);

  const handleDoubleClick = (elementId: ElementId, currentName: string) => {
    setEditingElementId(elementId);
    setEditingName(currentName || "");
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditingName(event.target.value);
  };

  const finalizeEdit = () => {
    if (editingElementId && editingName.trim()) {
      updateElementName(editingElementId, editingName.trim());
    }
    setEditingElementId(null);
    setEditingName("");
  };

  const handleBlur = () => {
    finalizeEdit();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      finalizeEdit();
    } else if (event.key === "Escape") {
      setEditingElementId(null);
      setEditingName("");
    }
  };

  useEffect(() => {
    if (editingElementId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingElementId]);

  // TODO: Add loading/empty state if needed

  return (
    <div className="p-2 h-full overflow-y-auto bg-gray-100 border-r border-gray-300">
      <h3 className="text-xs font-semibold mb-2 pb-1 border-b border-gray-200 text-gray-600 uppercase tracking-wider">
        Layers
      </h3>
      <ul className="space-y-1">
        {elementList.map((element) => {
          const isEditing = editingElementId === element.id;
          const isSelected = selectedElementId === element.id && !isEditing;

          return (
            <li
              key={element.id}
              onDoubleClick={() => handleDoubleClick(element.id, element.name)}
              onClick={() => {
                if (!isEditing) {
                  selectElement(element.id);
                }
              }}
              className={clsx(
                "text-xs px-2 py-1 rounded select-none truncate",
                isEditing
                  ? "bg-white border border-blue-500"
                  : isSelected
                    ? "bg-blue-500 text-white cursor-pointer"
                    : "hover:bg-gray-200 text-gray-700 cursor-pointer"
              )}
            >
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editingName}
                  onChange={handleNameChange}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full h-full bg-transparent outline-none border-none p-0 m-0 text-xs text-black"
                />
              ) : (
                element.name || `Element ${element.id.substring(0, 4)}`
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

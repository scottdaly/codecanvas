import React, { useState, useRef, useEffect } from "react";
import { useEditorStore } from "../../core/store";
import { ElementId, DesignElement } from "../../core/types";
import clsx from "clsx";

interface LayerItemProps {
  elementId: ElementId;
  depth: number;
}

// Recursive component to render layers and handle D&D
export const LayerItem: React.FC<LayerItemProps> = ({ elementId, depth }) => {
  const element = useEditorStore((state) => state.elements[elementId]);
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const selectElement = useEditorStore((state) => state.selectElement);
  // Get hierarchy actions from the store
  const setParent = useEditorStore((state) => state.setParent);
  const reorderSiblings = useEditorStore((state) => state.reorderSiblings);
  const elements = useEditorStore((state) => state.elements); // Need all elements for ancestry check
  // Get collapse state and action
  const collapsedLayers = useEditorStore((state) => state.collapsedLayers);
  const toggleLayerCollapse = useEditorStore(
    (state) => state.toggleLayerCollapse
  );
  const updateElementName = useEditorStore((state) => state.updateElementName); // Get rename action

  // State for visual feedback during drag-over
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropPosition, setDropPosition] = useState<
    "before" | "after" | "inside" | null
  >(null);

  // State for renaming
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null); // Ref for the input

  // Helper for ancestry check (copied from store, ideally share it)
  // Checks if potentialAncestorId is an ancestor of elementId
  function isAncestor(
    checkElementId: ElementId,
    potentialAncestorId: ElementId
  ): boolean {
    const currentElement = elements[checkElementId];
    if (!currentElement || !currentElement.parentId) {
      return false; // Reached root or element not found
    }
    if (currentElement.parentId === potentialAncestorId) {
      return true; // Found the ancestor
    }
    // Recurse up the tree
    return isAncestor(currentElement.parentId, potentialAncestorId);
  }

  useEffect(() => {
    // Focus and select input when editing starts
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (!element) {
    return null; // Element might have been deleted
  }

  const isSelected = selectedElementId === elementId;
  const hasChildren = element.children && element.children.length > 0;
  const isCollapsed = collapsedLayers.has(elementId);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (isEditing) e.preventDefault(); // Prevent dragging while editing name
    console.log("Drag Start:", elementId);
    e.dataTransfer.setData("text/plain", elementId);
    e.dataTransfer.effectAllowed = "move";
    // Add a slight delay to allow the ghost image to form before potentially hiding the original
    // setTimeout(() => e.currentTarget.classList.add('opacity-50'), 0);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
    const draggedId = e.dataTransfer.getData("text/plain"); // Check dragged ID early

    // Prevent dropping on self or descendants
    if (draggedId === elementId || isAncestor(elementId, draggedId)) {
      e.dataTransfer.dropEffect = "none";
      setDropPosition(null); // No valid drop position
      setIsDraggingOver(false);
      return;
    }

    e.dataTransfer.dropEffect = "move";
    setIsDraggingOver(true);

    // Determine drop position
    const rect = e.currentTarget.getBoundingClientRect();
    const thirdHeight = rect.height / 3;

    if (e.clientY < rect.top + thirdHeight) {
      setDropPosition("before");
    } else if (e.clientY > rect.bottom - thirdHeight) {
      setDropPosition("after");
    } else {
      setDropPosition("inside");
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Check if leaving the component bounds entirely
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX >= rect.right ||
      e.clientY < rect.top ||
      e.clientY >= rect.bottom
    ) {
      setIsDraggingOver(false);
      setDropPosition(null);
    }
    // Otherwise, DragOver will handle updates if moving between sections
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    setDropPosition(null);

    const draggedId = e.dataTransfer.getData("text/plain");
    const targetId = elementId;

    console.log(
      `Drop: dragged ${draggedId} onto ${targetId}, position: ${dropPosition}`
    );

    // Prevent dropping on self or descendant (final check)
    if (draggedId === targetId || isAncestor(targetId, draggedId)) {
      console.warn("Attempted to drop element onto itself or a descendant.");
      return;
    }

    // Call the appropriate store action based on the calculated drop position
    if (dropPosition === "inside") {
      console.log(`Calling setParent(${draggedId}, ${targetId})`);
      setParent(draggedId, targetId); // Nest inside: new parent is target
    } else if (dropPosition === "before") {
      console.log(
        `Calling reorderSiblings(${element.parentId}, ${draggedId}, ${targetId}, 'before')`
      );
      reorderSiblings(element.parentId, draggedId, targetId, "before");
    } else if (dropPosition === "after") {
      console.log(
        `Calling reorderSiblings(${element.parentId}, ${draggedId}, ${targetId}, 'after')`
      );
      reorderSiblings(element.parentId, draggedId, targetId, "after");
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    console.log("Drag End");
    // Clean up visual state regardless of drop success
    setIsDraggingOver(false);
    setDropPosition(null);
    // e.currentTarget.classList.remove('opacity-50'); // Remove dragging class if added
  };

  // Calculate indentation style
  const indentStyle = { paddingLeft: `${depth * 16}px` }; // 16px per depth level

  // Handler for toggling collapse state
  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent layer selection when clicking the toggle
    toggleLayerCollapse(elementId);
  };

  // Rename Handlers
  const handleDoubleClick = () => {
    if (!isEditing) {
      setEditingValue(element.name || "");
      setIsEditing(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingValue(e.target.value);
  };

  const handleFinalizeEdit = () => {
    if (isEditing) {
      const trimmedValue = editingValue.trim();
      if (trimmedValue && trimmedValue !== element.name) {
        console.log(`Updating name for ${elementId} to: ${trimmedValue}`);
        updateElementName(elementId, trimmedValue);
      }
      setIsEditing(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation(); // Prevent other keydown listeners (like delete element)
    if (e.key === "Enter") {
      handleFinalizeEdit();
    } else if (e.key === "Escape") {
      setIsEditing(false); // Discard changes
      setEditingValue(element.name || ""); // Reset value if needed
    }
  };

  const handleInputBlur = () => {
    // Use a slight delay to allow potential Enter key press to process first
    setTimeout(handleFinalizeEdit, 100);
  };

  return (
    // Root container for the item and its potential children
    <div className="layer-item-container">
      {/* The actual draggable layer item */}
      <div
        draggable={!isEditing} // Disable dragging while editing
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        onClick={() => !isEditing && selectElement(elementId)} // Select only if not editing
        onDoubleClick={handleDoubleClick} // Enable editing on double click
        style={indentStyle}
        className={clsx(
          "flex items-center p-1 text-xs cursor-pointer hover:bg-gray-200 select-none border border-transparent", // Base styles, transparent border for layout stability
          { "bg-blue-100 hover:bg-blue-200": isSelected && !isEditing }, // Highlight only if selected AND not editing
          { "bg-white": isEditing }, // Different style for editing state
          // Visual feedback classes based on dropPosition state
          isDraggingOver &&
            dropPosition === "before" &&
            "border-t-2 border-t-blue-500",
          isDraggingOver &&
            dropPosition === "after" &&
            "border-b-2 border-b-blue-500",
          isDraggingOver && dropPosition === "inside" && "bg-blue-300" // Highlight background for nesting
        )}
      >
        {/* Collapse Toggle Button (only if children exist) */}
        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {hasChildren && (
            <button
              onClick={handleToggleCollapse}
              className="text-gray-500 hover:text-gray-800 focus:outline-none"
              aria-expanded={!isCollapsed}
              tabIndex={-1} // Prevent tabbing to the button
            >
              {/* Simple text arrows for now - replace with SVG later? */}
              {isCollapsed ? "▶" : "▼"}
            </button>
          )}
        </div>

        {/* Render Input or Name */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editingValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur} // Use blur with delay
            onKeyDown={handleInputKeyDown}
            onClick={(e) => e.stopPropagation()} // Prevent layer selection
            onMouseDown={(e) => e.stopPropagation()} // Prevent drag start attempt
            className="flex-grow ml-1 p-0 m-0 border-none outline-none bg-transparent text-xs h-full"
          />
        ) : (
          <span className="ml-1 truncate">
            {element.name || `Element ${element.id}`}
          </span>
        )}
      </div>
      {/* Conditionally Render Children based on collapse state */}
      {!isCollapsed && hasChildren && (
        <div className="layer-item-children">
          {element.children.map((childId) => (
            // Pass elementId and incremented depth
            <LayerItem key={childId} elementId={childId} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// packages/editor-frontend/src/core/types.ts
export type ElementId = string;

// Using CSSProperties for flexibility, but we'll only use a subset initially
export interface ElementStyle extends React.CSSProperties {
  // Add specific properties we know we'll use for clarity if desired
  // e.g., left?: number | string; top?: number | string; ...
}

export interface DesignElement {
  id: ElementId;
  type: "div"; // Only divs for now
  name: string; // For the layers panel later
  style: ElementStyle; // Represents CSS properties
  parentId: ElementId | null; // ID of the parent element, null for root elements
  children: ElementId[]; // IDs of child elements, ordered
}

// Type for the state slice managing elements
export interface ElementsSlice {
  elements: Record<ElementId, DesignElement>; // Store elements by ID for easy lookup
  selectedElementId: ElementId | null;
  addElement: (element: DesignElement) => void;
  selectElement: (id: ElementId | null) => void;
  updateElementStyle: (id: ElementId, style: Partial<ElementStyle>) => void;
  updateElementName: (id: ElementId, newName: string) => void;
  deleteElement: (id: ElementId) => void;
  // More actions later: deleteElement, moveElement, resizeElement etc.
}

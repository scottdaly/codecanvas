// packages/editor-frontend/src/core/store.ts
import { create } from "zustand";
import { ElementId, DesignElement, ElementsSlice, ElementStyle } from "./types";
import { immer } from "zustand/middleware/immer"; // Using Immer for easier immutable updates

// Helper to generate simple IDs (replace with something more robust later like nanoid)
let nextId = 0;
const generateId = (): ElementId => `el_${nextId++}`;

// Create the Zustand store
export const useEditorStore = create<ElementsSlice>()(
  // Use Immer middleware for making state updates easier
  immer((set) => ({
    elements: {}, // Start with no elements
    selectedElementId: null,

    addElement: (element) =>
      set((state) => {
        state.elements[element.id] = element;
      }),

    selectElement: (id) =>
      set((state) => {
        state.selectedElementId = id;
      }),

    updateElementStyle: (id, newStyle) =>
      set((state) => {
        const element = state.elements[id];
        if (element) {
          // Merge new styles with existing ones
          element.style = { ...element.style, ...newStyle };
        }
      }),
  }))
);

// --- Example Usage Action ---
// This function encapsulates creating and adding a default element
export function createDefaultDiv() {
  const newId = generateId();
  const defaultElement: DesignElement = {
    id: newId,
    type: "div",
    name: `Div ${newId.split("_")[1]}`, // Simple default name
    style: {
      position: "absolute", // Start with absolute positioning for simplicity
      left: "50px",
      top: "50px",
      width: "100px",
      height: "100px",
      backgroundColor: "#ffffff",
      border: "1px solid #cccccc", // Add a default border to see it
    },
  };
  useEditorStore.getState().addElement(defaultElement);
}

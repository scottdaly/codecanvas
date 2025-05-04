// packages/editor-frontend/src/core/store.ts
import { create } from "zustand";
import { ElementId, DesignElement, ElementsSlice, ElementStyle } from "./types";
import { immer } from "zustand/middleware/immer"; // Using Immer for easier immutable updates
import { produceWithPatches, applyPatches } from "immer";
import type { Patch } from "immer"; // Import the Patch type

// Helper to generate simple IDs (replace with something more robust later like nanoid)
let nextId = 0;
const generateId = (): ElementId => `el_${nextId++}`;

// Interface for History Entry
interface HistoryEntry {
  patches: Patch[];
  inversePatches: Patch[];
}

// Extended state slice including history
interface EditorState extends ElementsSlice {
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  canUndo: boolean;
  canRedo: boolean;
  _ignoreHistory: boolean; // Internal flag for undo/redo operations
  isInteractionActive: boolean; // Flag for ongoing drag/resize
  interactionSnapshot: {
    elements: ElementsSlice["elements"];
    selectedElementId: ElementId | null;
  } | null;
  undo: () => void;
  redo: () => void;
  recordHistory: (entry: HistoryEntry) => void;
  startInteraction: () => void; // Action to signal interaction start
  endInteraction: () => void; // Action to signal interaction end
  // Actions that modify state need to be declared here if they use get() or other actions
  // (We'll define them fully below, but need the signature)
  addElement: (element: DesignElement) => void;
  updateElementStyle: (id: ElementId, newStyle: Partial<ElementStyle>) => void;
  updateElementName: (id: ElementId, newName: string) => void;
  deleteElement: (id: ElementId) => void;
}

// Create the Zustand store
export const useEditorStore = create<EditorState>()(
  // Use Immer middleware for making state updates easier
  immer((set, get) => ({
    elements: {}, // Start with no elements
    selectedElementId: null,
    undoStack: [],
    redoStack: [],
    canUndo: false,
    canRedo: false,
    _ignoreHistory: false,
    isInteractionActive: false,
    interactionSnapshot: null,

    // --- Helper for recording history ---
    recordHistory: (entry: HistoryEntry) => {
      console.log("recordHistory called");
      set((state) => {
        // Push a new history entry
        state.undoStack.push(entry);

        // Always clear redo stack when a new history entry is made or amended
        if (state.redoStack.length > 0) {
          state.redoStack = [];
          state.canRedo = false;
        }

        // Ensure canUndo is true after recording
        state.canUndo = true;
      });
    },

    addElement: (element) => {
      if (get()._ignoreHistory) {
        set((state) => {
          state.elements[element.id] = element;
        });
        return;
      }

      const [nextState, patches, inversePatches] = produceWithPatches(
        get(),
        (draft) => {
          draft.elements[element.id] = element;
          // Optionally select the new element
          // draft.selectedElementId = element.id;
        }
      );

      set((state) => {
        state.elements[element.id] = element;
        // Optionally select the new element
        // state.selectedElementId = element.id;
      });

      if (patches.length > 0) {
        get().recordHistory({ patches, inversePatches });
      }
    },

    selectElement: (id) =>
      set((state) => {
        // Selection is typically not an undoable action
        state.selectedElementId = id;
      }),

    updateElementStyle: (id, newStyle) => {
      // console.log(`updateElementStyle called for ${id}`, { isInteractionActive: get().isInteractionActive, _ignoreHistory: get()._ignoreHistory, newStyle });

      if (get()._ignoreHistory) {
        // If ignoring history (undo/redo), just apply the state change directly
        set((state) => {
          const element = state.elements[id];
          if (element) {
            element.style = { ...element.style, ...newStyle };
          }
        });
        return;
      }

      // Always generate patches to see the change
      const [nextState, patches, inversePatches] = produceWithPatches(
        get(),
        (draft) => {
          const element = draft.elements[id];
          if (element) {
            element.style = { ...element.style, ...newStyle };
          }
        }
      );

      // Apply the changes *after* generating patches, letting Immer handle the update
      set((state) => {
        const element = state.elements[id];
        if (element) {
          element.style = { ...element.style, ...newStyle };
        }
      });

      // Only record history if NOT interactive and patches exist
      if (!get().isInteractionActive && patches.length > 0) {
        console.log(
          "RECORDING history from updateElementStyle (Should NOT happen during interaction)"
        );
        // We don't check _ignoreHistory here again because we returned earlier if it was true
        get().recordHistory({ patches, inversePatches });
      }
    },

    // Renaming could also be undoable, following the same pattern
    updateElementName: (id: ElementId, newName: string) => {
      // If interaction is active, update directly without history (assuming rename isn't interactive)
      // If renaming *could* be interactive (e.g., live input during drag), apply same pattern as updateElementStyle
      // For now, assume it's non-interactive
      // if (get().isInteractionActive) { ... return; }

      // Original logic
      if (get()._ignoreHistory) {
        set((state) => {
          const element = state.elements[id];
          if (element) {
            element.name = newName;
          }
        });
        return;
      }

      const [nextState, patches, inversePatches] = produceWithPatches(
        get(),
        (draft) => {
          const element = draft.elements[id];
          if (element) {
            element.name = newName;
          }
        }
      );

      set((state) => {
        const element = state.elements[id];
        if (element) {
          element.name = newName;
        }
      });

      if (patches.length > 0) {
        get().recordHistory({ patches, inversePatches });
      }
    },

    deleteElement: (id: ElementId) => {
      // Deletion is typically non-interactive, keep original logic
      if (get()._ignoreHistory) {
        set((state) => {
          delete state.elements[id];
          if (state.selectedElementId === id) {
            state.selectedElementId = null;
          }
        });
        return;
      }

      const [nextState, patches, inversePatches] = produceWithPatches(
        get(),
        (draft) => {
          delete draft.elements[id];
          if (draft.selectedElementId === id) {
            draft.selectedElementId = null; // Deselect if deleted
          }
        }
      );

      set((state) => {
        delete state.elements[id];
        if (state.selectedElementId === id) {
          state.selectedElementId = null;
        }
      });

      if (patches.length > 0) {
        get().recordHistory({ patches, inversePatches });
      }
    },

    // --- Interaction State Actions ---
    startInteraction: () => {
      console.log("Interaction START");
      set((state) => {
        state._ignoreHistory = true;
        state.isInteractionActive = true;
        // Capture initial state snapshot
        state.interactionSnapshot = {
          elements: get().elements,
          selectedElementId: get().selectedElementId,
        };
        console.log("Snapshot captured:", state.interactionSnapshot);
      });
      set((state) => {
        state._ignoreHistory = false;
      }); // Reset flag immediately
    },

    endInteraction: () => {
      console.log("Interaction END start");
      set((state) => {
        state._ignoreHistory = true;
        const startSnapshot = get().interactionSnapshot;
        if (get().isInteractionActive && startSnapshot) {
          console.log(
            "Calculating final patches using snapshot:",
            startSnapshot
          );
          // Calculate patches based on difference from startSnapshot to current state
          const [finalState, patches, inversePatches] = produceWithPatches(
            startSnapshot, // Base state is the snapshot
            (draft) => {
              // Apply current values to the draft
              draft.elements = get().elements;
              draft.selectedElementId = get().selectedElementId;
            }
          );

          console.log("Final patches generated:", patches);
          // Record the single history entry for the entire interaction
          if (patches.length > 0) {
            // Need to call the simplified recordHistory *within* this set call
            // to ensure atomicity and correct state context
            console.log("Pushing final interaction entry to undoStack");
            state.undoStack.push({ patches, inversePatches });
            if (state.redoStack.length > 0) {
              state.redoStack = [];
              state.canRedo = false;
            }
            state.canUndo = true;
          }
        }

        state.isInteractionActive = false;
        state.interactionSnapshot = null; // Clear the snapshot
        console.log(
          "Interaction END finish: isInteractionActive=false, snapshot=null"
        );
      });
      set((state) => {
        state._ignoreHistory = false;
      });
    },

    // --- Undo/Redo Actions ---
    undo: () => {
      if (!get().canUndo) return;

      const entry = get().undoStack[get().undoStack.length - 1];

      set((state) => {
        state._ignoreHistory = true;
      }); // Prevent undo from being recorded

      try {
        // Apply inverse patches to revert state
        const revertedState = applyPatches(get(), entry.inversePatches);

        // Manually set the state based on the reverted snapshot
        // We need to be careful here not to trigger the immer middleware's own patch generation
        // during the undo/redo operation itself.
        set((state) => {
          // Directly mutate the draft with reverted values
          state.elements = revertedState.elements;
          state.selectedElementId = revertedState.selectedElementId;
          // ... potentially other state slices affected by history ...

          // Move the undone entry to the redo stack
          state.undoStack.pop();
          state.redoStack.push(entry);
          state.canUndo = state.undoStack.length > 0;
          state.canRedo = true;
        });
      } catch (error) {
        console.error("Undo failed:", error);
        // Potentially reset history or notify user
      } finally {
        set((state) => {
          state._ignoreHistory = false;
        }); // Reset the flag
      }
    },

    redo: () => {
      if (!get().canRedo) return;

      const entry = get().redoStack[get().redoStack.length - 1];

      set((state) => {
        state._ignoreHistory = true;
      }); // Prevent redo from being recorded

      try {
        // Apply forward patches to redo state
        const redoneState = applyPatches(get(), entry.patches);

        set((state) => {
          // Apply the redone state snapshot
          state.elements = redoneState.elements;
          state.selectedElementId = redoneState.selectedElementId;
          // ... other state ...

          // Move the redone entry back to the undo stack
          state.redoStack.pop();
          state.undoStack.push(entry);
          state.canRedo = state.redoStack.length > 0;
          state.canUndo = true;
        });
      } catch (error) {
        console.error("Redo failed:", error);
        // Potentially reset history or notify user
      } finally {
        set((state) => {
          state._ignoreHistory = false;
        }); // Reset the flag
      }
    },
  }))
);

// --- Example Usage Action ---
// This function encapsulates creating and adding a default element
// It now directly uses the action from the store state
export function createDefaultDiv() {
  const addElementAction = useEditorStore.getState().addElement; // Get the action
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
  addElementAction(defaultElement); // Call the action
}

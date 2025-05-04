// packages/editor-frontend/src/core/store.ts
import { create } from "zustand";
import { ElementId, DesignElement, ElementsSlice, ElementStyle } from "./types";
import { immer } from "zustand/middleware/immer"; // Using Immer for easier immutable updates
import {
  produceWithPatches,
  applyPatches,
  enablePatches,
  enableMapSet,
} from "immer";
import type { Patch } from "immer"; // Import the Patch type

enablePatches(); // IMPORTANT: Call this once to enable Immer patches
enableMapSet(); // Call enableMapSet

// Helper to generate simple IDs (replace with something more robust later like nanoid)
let nextId = 0;
const generateId = (): ElementId => `el_${nextId++}`;

// Interface for History Entry
interface HistoryEntry {
  patches: Patch[];
  inversePatches: Patch[];
}

// --- Recursive Helper for Deletion ---
// Gets all descendant IDs of a given element
function getAllDescendantIds(
  elementId: ElementId,
  elements: Record<ElementId, DesignElement>
): ElementId[] {
  const element = elements[elementId];
  if (!element || !element.children || element.children.length === 0) {
    return [];
  }

  let descendantIds: ElementId[] = [...element.children];
  element.children.forEach((childId) => {
    descendantIds = descendantIds.concat(
      getAllDescendantIds(childId, elements)
    );
  });
  return descendantIds;
}
// ---

// --- Recursive Helper for Ancestry Check ---
// Checks if potentialAncestorId is an ancestor of elementId
function isAncestor(
  elementId: ElementId,
  potentialAncestorId: ElementId,
  elements: Record<ElementId, DesignElement>
): boolean {
  const element = elements[elementId];
  if (!element || !element.parentId) {
    return false; // Reached root or element not found
  }
  if (element.parentId === potentialAncestorId) {
    return true; // Found the ancestor
  }
  // Recurse up the tree
  return isAncestor(element.parentId, potentialAncestorId, elements);
}
// ---

// Extended state slice including history
interface EditorState extends ElementsSlice {
  rootElementOrder: ElementId[]; // Added for root order
  collapsedLayers: Set<ElementId>; // Added for collapse state
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  canUndo: boolean;
  canRedo: boolean;
  _ignoreHistory: boolean; // Internal flag for undo/redo operations
  isInteractionActive: boolean; // Flag for ongoing drag/resize
  // Snapshot now implicitly includes parentId/children via DesignElement
  interactionSnapshot: {
    elements: ElementsSlice["elements"];
    selectedElementId: ElementId | null;
    // Snapshot needs to include root order if it changes during interaction (unlikely but possible)
    rootElementOrder: ElementId[];
  } | null;
  undo: () => void;
  redo: () => void;
  recordHistory: (entry: HistoryEntry) => void;
  startInteraction: () => void; // Action to signal interaction start
  endInteraction: () => void; // Action to signal interaction end
  // Actions that modify state need to be declared here if they use get() or other actions
  // (We'll define them fully below, but need the signature)
  addElement: (
    element: DesignElement,
    parentId?: ElementId | null,
    targetIndex?: number
  ) => void; // Added targetIndex
  updateElementStyle: (id: ElementId, newStyle: Partial<ElementStyle>) => void;
  updateElementName: (id: ElementId, newName: string) => void;
  deleteElement: (id: ElementId) => void;
  setParent: (
    childId: ElementId,
    newParentId: ElementId | null,
    targetIndex?: number
  ) => void;
  reorderSiblings: (
    parentId: ElementId | null,
    draggedId: ElementId,
    targetId: ElementId,
    position: "before" | "after"
  ) => void;
  toggleLayerCollapse: (elementId: ElementId) => void;
}

// Create the Zustand store
export const useEditorStore = create<EditorState>()(
  // Use Immer middleware for making state updates easier
  immer((set, get) => ({
    elements: {}, // Start with no elements
    selectedElementId: null,
    rootElementOrder: [], // Initialize root order
    collapsedLayers: new Set<ElementId>(), // Initialize collapse state
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

    // --- Core Element Actions ---
    // Updated addElement to handle rootElementOrder and targetIndex
    addElement: (element, parentId = null, targetIndex) => {
      const newElement: DesignElement = {
        ...element,
        parentId: parentId,
        children: [],
      };

      if (get()._ignoreHistory) {
        set((state) => {
          state.elements[newElement.id] = newElement;
          if (parentId && state.elements[parentId]) {
            // Add to parent's children at index or end
            const children = state.elements[parentId].children;
            if (targetIndex !== undefined && targetIndex !== null) {
              children.splice(targetIndex, 0, newElement.id);
            } else {
              children.push(newElement.id);
            }
          } else {
            // Add to root order at index or end
            if (targetIndex !== undefined && targetIndex !== null) {
              state.rootElementOrder.splice(targetIndex, 0, newElement.id);
            } else {
              state.rootElementOrder.push(newElement.id);
            }
          }
        });
        return;
      }

      const [nextState, patches, inversePatches] = produceWithPatches(
        get(),
        (draft) => {
          draft.elements[newElement.id] = newElement;
          if (parentId && draft.elements[parentId]) {
            // Add to parent's children at index or end
            draft.elements[parentId].children =
              draft.elements[parentId].children || [];
            const children = draft.elements[parentId].children;
            if (targetIndex !== undefined && targetIndex !== null) {
              children.splice(targetIndex, 0, newElement.id);
            } else {
              children.push(newElement.id);
            }
          } else {
            // Add to root order at index or end
            if (targetIndex !== undefined && targetIndex !== null) {
              draft.rootElementOrder.splice(targetIndex, 0, newElement.id);
            } else {
              draft.rootElementOrder.push(newElement.id);
            }
          }
        }
      );

      // Apply the state change
      set((state) => {
        state.elements[newElement.id] = newElement;
        if (parentId && state.elements[parentId]) {
          const children = state.elements[parentId].children;
          if (targetIndex !== undefined && targetIndex !== null) {
            children.splice(targetIndex, 0, newElement.id);
          } else {
            children.push(newElement.id);
          }
        } else {
          if (targetIndex !== undefined && targetIndex !== null) {
            state.rootElementOrder.splice(targetIndex, 0, newElement.id);
          } else {
            state.rootElementOrder.push(newElement.id);
          }
        }
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
      // ... (existing updateElementStyle logic - no changes needed for hierarchy here)
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

    updateElementName: (id: ElementId, newName: string) => {
      // ... (existing updateElementName logic - no changes needed for hierarchy here)
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

    // Updated deleteElement to handle rootElementOrder
    deleteElement: (id: ElementId) => {
      const elementToDelete = get().elements[id];
      if (!elementToDelete) return; // Already deleted

      const isRoot = elementToDelete.parentId === null;
      const oldParentId = elementToDelete.parentId; // Store parent before potential deletion

      if (get()._ignoreHistory) {
        set((state) => {
          const allIdsToDelete = [
            id,
            ...getAllDescendantIds(id, state.elements),
          ];

          // Remove from parent's children array OR root order
          if (oldParentId && state.elements[oldParentId]) {
            state.elements[oldParentId].children = state.elements[
              oldParentId
            ].children.filter((childId) => childId !== id);
          } else if (isRoot) {
            state.rootElementOrder = state.rootElementOrder.filter(
              (rootId) => rootId !== id
            );
          }

          // Deselect if needed
          if (
            state.selectedElementId &&
            allIdsToDelete.includes(state.selectedElementId)
          ) {
            state.selectedElementId = null;
          }

          // Delete the element and all descendants
          allIdsToDelete.forEach((deleteId) => {
            delete state.elements[deleteId];
          });
        });
        return;
      }

      const [nextState, patches, inversePatches] = produceWithPatches(
        get(),
        (draft) => {
          const elementToDeleteDraft = draft.elements[id];
          if (!elementToDeleteDraft) return;

          const isRootDraft = elementToDeleteDraft.parentId === null;
          const oldParentIdDraft = elementToDeleteDraft.parentId;
          const allIdsToDelete = [
            id,
            ...getAllDescendantIds(id, draft.elements),
          ];

          // Remove from parent's children array OR root order
          if (oldParentIdDraft && draft.elements[oldParentIdDraft]) {
            draft.elements[oldParentIdDraft].children = draft.elements[
              oldParentIdDraft
            ].children.filter((childId) => childId !== id);
          } else if (isRootDraft) {
            draft.rootElementOrder = draft.rootElementOrder.filter(
              (rootId) => rootId !== id
            );
          }

          // Deselect if needed
          if (
            draft.selectedElementId &&
            allIdsToDelete.includes(draft.selectedElementId)
          ) {
            draft.selectedElementId = null;
          }

          // Delete the element and all descendants
          allIdsToDelete.forEach((deleteId) => {
            delete draft.elements[deleteId];
          });
        }
      );

      set((state) => {
        const allIdsToDelete = [
          id,
          ...getAllDescendantIds(id, state.elements), // Need elements from current state here
        ];

        // Remove from parent's children array OR root order
        if (oldParentId && state.elements[oldParentId]) {
          state.elements[oldParentId].children = state.elements[
            oldParentId
          ].children.filter((childId) => childId !== id);
        } else if (isRoot) {
          state.rootElementOrder = state.rootElementOrder.filter(
            (rootId) => rootId !== id
          );
        }

        // Deselect if needed
        if (
          state.selectedElementId &&
          allIdsToDelete.includes(state.selectedElementId)
        ) {
          state.selectedElementId = null;
        }

        // Delete the element and all descendants
        allIdsToDelete.forEach((deleteId) => {
          delete state.elements[deleteId];
        });
      });

      if (patches.length > 0) {
        get().recordHistory({ patches, inversePatches });
      }
    },

    // --- Hierarchy Manipulation Actions ---
    setParent: (childId, newParentId, targetIndex) => {
      const child = get().elements[childId];
      if (!child) return;

      // Prevent dropping onto self or descendant
      if (
        childId === newParentId ||
        (newParentId && isAncestor(newParentId, childId, get().elements))
      ) {
        console.warn("Cannot set parent to self or descendant");
        return;
      }

      const oldParentId = child.parentId;
      const wasRoot = oldParentId === null;
      const isNowRoot = newParentId === null;

      if (get()._ignoreHistory) {
        set((state) => {
          const childState = state.elements[childId];
          if (!childState) return; // Re-check in case deleted during async?

          // 1. Remove from old parent/root order
          if (oldParentId && state.elements[oldParentId]) {
            state.elements[oldParentId].children = state.elements[
              oldParentId
            ].children.filter((id) => id !== childId);
          } else if (wasRoot) {
            state.rootElementOrder = state.rootElementOrder.filter(
              (id) => id !== childId
            );
          }

          // 2. Update child's parentId
          childState.parentId = newParentId;

          // 3. Add to new parent's children or root order
          if (newParentId && state.elements[newParentId]) {
            const children = state.elements[newParentId].children;
            if (targetIndex !== undefined && targetIndex !== null) {
              children.splice(targetIndex, 0, childId);
            } else {
              children.push(childId);
            }
          } else if (isNowRoot) {
            if (targetIndex !== undefined && targetIndex !== null) {
              state.rootElementOrder.splice(targetIndex, 0, childId);
            } else {
              state.rootElementOrder.push(childId);
            }
          }
        });
        return;
      }

      const [nextState, patches, inversePatches] = produceWithPatches(
        get(),
        (draft) => {
          const childDraft = draft.elements[childId];
          if (!childDraft) return;

          // Re-check validity inside patch
          if (
            childId === newParentId ||
            (newParentId && isAncestor(newParentId, childId, draft.elements))
          ) {
            console.warn("Invalid parent assignment inside patch");
            return; // Prevent modification
          }

          const oldParentIdDraft = childDraft.parentId;
          const wasRootDraft = oldParentIdDraft === null;
          const isNowRootDraft = newParentId === null;

          // 1. Remove from old parent/root order
          if (oldParentIdDraft && draft.elements[oldParentIdDraft]) {
            draft.elements[oldParentIdDraft].children = draft.elements[
              oldParentIdDraft
            ].children.filter((id) => id !== childId);
          } else if (wasRootDraft) {
            draft.rootElementOrder = draft.rootElementOrder.filter(
              (id) => id !== childId
            );
          }

          // 2. Update child's parentId
          childDraft.parentId = newParentId;

          // 3. Add to new parent's children or root order
          if (newParentId && draft.elements[newParentId]) {
            draft.elements[newParentId].children =
              draft.elements[newParentId].children || [];
            const children = draft.elements[newParentId].children;
            if (targetIndex !== undefined && targetIndex !== null) {
              children.splice(targetIndex, 0, childId);
            } else {
              children.push(childId);
            }
          } else if (isNowRootDraft) {
            if (targetIndex !== undefined && targetIndex !== null) {
              draft.rootElementOrder.splice(targetIndex, 0, childId);
            } else {
              draft.rootElementOrder.push(childId);
            }
          }
        }
      );

      if (patches.length > 0) {
        set((state) => {
          // Apply computed changes (safer than direct mutation if produce exited early)
          const childState = state.elements[childId];
          if (!childState) return;

          // 1. Remove from old parent/root order
          if (oldParentId && state.elements[oldParentId]) {
            state.elements[oldParentId].children = state.elements[
              oldParentId
            ].children.filter((id) => id !== childId);
          } else if (wasRoot) {
            state.rootElementOrder = state.rootElementOrder.filter(
              (id) => id !== childId
            );
          }

          // 2. Update child's parentId
          childState.parentId = newParentId;

          // 3. Add to new parent's children or root order
          if (newParentId && state.elements[newParentId]) {
            const children = state.elements[newParentId].children;
            if (targetIndex !== undefined && targetIndex !== null) {
              children.splice(targetIndex, 0, childId);
            } else {
              children.push(childId);
            }
          } else if (isNowRoot) {
            if (targetIndex !== undefined && targetIndex !== null) {
              state.rootElementOrder.splice(targetIndex, 0, childId);
            } else {
              state.rootElementOrder.push(childId);
            }
          }
        });
        get().recordHistory({ patches, inversePatches });
      }
    },

    // Updated reorderSiblings to handle rootElementOrder
    reorderSiblings: (parentId, draggedId, targetId, position) => {
      // Determine the list to reorder
      const getSiblingList = (state: EditorState): ElementId[] => {
        return parentId === null
          ? state.rootElementOrder // Use the dedicated root order list
          : state.elements[parentId]?.children || [];
      };
      // Function to update the list in the state
      const updateSiblingList = (state: EditorState, newList: ElementId[]) => {
        if (parentId === null) {
          state.rootElementOrder = newList;
        } else if (state.elements[parentId]) {
          state.elements[parentId].children = newList;
        }
      };

      if (get()._ignoreHistory) {
        set((state) => {
          const siblings = [...getSiblingList(state)]; // Work on a copy
          const draggedIndex = siblings.indexOf(draggedId);
          let targetIndex = siblings.indexOf(targetId);

          if (draggedIndex === -1 || targetIndex === -1) return;

          const [draggedItem] = siblings.splice(draggedIndex, 1);
          targetIndex = siblings.indexOf(targetId); // Recalculate after splice
          const insertAtIndex =
            position === "before" ? targetIndex : targetIndex + 1;
          siblings.splice(insertAtIndex, 0, draggedItem);

          updateSiblingList(state, siblings); // Update the correct list in state
        });
        return;
      }

      const [nextState, patches, inversePatches] = produceWithPatches(
        get(),
        (draft) => {
          const siblings = getSiblingList(draft);
          const currentSiblings = [...siblings]; // Work on a copy for calculation
          const draggedIndex = currentSiblings.indexOf(draggedId);
          let targetIndex = currentSiblings.indexOf(targetId);

          if (draggedIndex === -1 || targetIndex === -1) return;

          const [draggedItem] = currentSiblings.splice(draggedIndex, 1);
          targetIndex = currentSiblings.indexOf(targetId); // Recalculate after splice
          const insertAtIndex =
            position === "before" ? targetIndex : targetIndex + 1;
          currentSiblings.splice(insertAtIndex, 0, draggedItem);

          // Update the correct list in the draft
          if (parentId === null) {
            draft.rootElementOrder = currentSiblings;
          } else if (draft.elements[parentId]) {
            draft.elements[parentId].children = currentSiblings;
          }
        }
      );

      if (patches.length > 0) {
        set((state) => {
          // Apply computed changes using the helper function
          const siblings = [...getSiblingList(state)]; // Work on a copy
          const draggedIndex = siblings.indexOf(draggedId);
          let targetIndex = siblings.indexOf(targetId);

          if (draggedIndex === -1 || targetIndex === -1) return;

          const [draggedItem] = siblings.splice(draggedIndex, 1);
          targetIndex = siblings.indexOf(targetId); // Recalculate after splice
          const insertAtIndex =
            position === "before" ? targetIndex : targetIndex + 1;
          siblings.splice(insertAtIndex, 0, draggedItem);

          updateSiblingList(state, siblings); // Update the correct list in state
        });
        get().recordHistory({ patches, inversePatches });
      }
    },

    // --- Interaction State Actions --- (No changes needed for hierarchy here)
    startInteraction: () => {
      // ... (existing startInteraction logic)
      console.log("Interaction START");
      set((state) => {
        state._ignoreHistory = true;
        state.isInteractionActive = true;
        // Capture snapshot including root order
        state.interactionSnapshot = {
          elements: get().elements,
          selectedElementId: get().selectedElementId,
          rootElementOrder: get().rootElementOrder,
        };
        console.log("Snapshot captured:", state.interactionSnapshot);
      });
      set((state) => {
        state._ignoreHistory = false;
      });
    },

    endInteraction: () => {
      // ... (existing endInteraction logic)
      console.log("Interaction END start");
      set((state) => {
        state._ignoreHistory = true;
        const startSnapshot = get().interactionSnapshot;
        if (get().isInteractionActive && startSnapshot) {
          console.log(
            "Calculating final patches using snapshot:",
            startSnapshot
          );
          const [finalState, patches, inversePatches] = produceWithPatches(
            startSnapshot, // Base state is the snapshot
            (draft) => {
              // Apply current values to the draft
              draft.elements = get().elements;
              draft.selectedElementId = get().selectedElementId;
              draft.rootElementOrder = get().rootElementOrder; // Include root order
            }
          );

          console.log("Final patches generated:", patches);
          if (patches.length > 0) {
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
        state.interactionSnapshot = null;
        console.log(
          "Interaction END finish: isInteractionActive=false, snapshot=null"
        );
      });
      set((state) => {
        state._ignoreHistory = false;
      });
    },

    // --- Undo/Redo Actions --- (No changes needed for hierarchy here, rely on patches)
    undo: () => {
      // ... (existing undo logic)
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
          state.rootElementOrder = revertedState.rootElementOrder; // Restore root order
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
      // ... (existing redo logic)
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
          state.rootElementOrder = redoneState.rootElementOrder; // Restore root order
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

    // --- UI State Actions ---
    toggleLayerCollapse: (elementId) =>
      set((state) => {
        // No history needed for UI state
        if (state.collapsedLayers.has(elementId)) {
          state.collapsedLayers.delete(elementId);
        } else {
          state.collapsedLayers.add(elementId);
        }
      }),
  }))
);

// --- Example Usage Action --- Updated createDefaultDiv
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
    parentId: null, // Initialize parentId
    children: [], // Initialize children
  };
  addElementAction(defaultElement); // Add element (implicitly as root element)
}

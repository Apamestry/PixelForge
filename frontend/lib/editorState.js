/**
 * Editor State Reducer Module
 *
 * Implements:
 * - add, update, move, resize, delete, duplicate, reorder
 * - set canvas size and background
 * - element selection (excluded from history)
 * - undo/redo with history capped at 100
 * - coalesced updates for typing and dragging
 */

import { generateElementId } from "./dropPosition";

export const MAX_HISTORY = 100;

export const initialEditorState = {
  canvas: {
    version: 1,
    width: 1080,
    height: 1080,
    background: "#FFFFFF",
    elements: [],
  },
  selectedId: null,
  history: {
    past: [],
    future: [],
  },
  isCoalescing: false,
};

/**
 * Creates a clean copy of the canvas JSON matching SPEC Section 3.
 */
function cloneCanvas(canvas) {
  return {
    version: canvas.version || 1,
    width: canvas.width,
    height: canvas.height,
    background: canvas.background,
    elements: canvas.elements.map((el) => {
      const cloned = { ...el };
      if (el.filters) {
        cloned.filters = { ...el.filters };
      }
      return cloned;
    }),
  };
}

/**
 * Pushes canvas state to history past, capping at MAX_HISTORY and clearing future.
 */
function pushHistory(history, currentCanvas) {
  const newPast = [...history.past, cloneCanvas(currentCanvas)];
  if (newPast.length > MAX_HISTORY) {
    newPast.shift();
  }
  return {
    past: newPast,
    future: [],
  };
}

export function editorReducer(state, action) {
  switch (action.type) {
    case "SET_CANVAS": {
      const canvas = cloneCanvas(action.payload);
      return {
        ...state,
        canvas,
        selectedId: null,
        history: { past: [], future: [] },
        isCoalescing: false,
      };
    }

    case "SELECT_ELEMENT": {
      return {
        ...state,
        selectedId: action.payload,
      };
    }

    case "START_COALESCE": {
      if (state.isCoalescing) {
        return state;
      }
      return {
        ...state,
        isCoalescing: true,
        history: pushHistory(state.history, state.canvas),
      };
    }

    case "END_COALESCE": {
      return {
        ...state,
        isCoalescing: false,
      };
    }

    case "ADD_ELEMENT": {
      const element = action.payload;
      const history = pushHistory(state.history, state.canvas);
      const nextElements = [...state.canvas.elements, element];
      return {
        ...state,
        canvas: { ...state.canvas, elements: nextElements },
        selectedId: element.id,
        history,
        isCoalescing: false,
      };
    }

    case "UPDATE_ELEMENT": {
      const updated = action.payload;
      const coalesce = Boolean(action.coalesce);

      let history = state.history;
      let isCoalescing = state.isCoalescing;

      if (!coalesce) {
        history = pushHistory(state.history, state.canvas);
        isCoalescing = false;
      } else if (!state.isCoalescing) {
        history = pushHistory(state.history, state.canvas);
        isCoalescing = true;
      }

      const nextElements = state.canvas.elements.map((el) =>
        el.id === updated.id ? { ...el, ...updated } : el
      );

      return {
        ...state,
        canvas: { ...state.canvas, elements: nextElements },
        history,
        isCoalescing,
      };
    }

    case "MOVE_ELEMENT": {
      const { id, x, y } = action.payload;
      const coalesce = Boolean(action.coalesce);

      let history = state.history;
      let isCoalescing = state.isCoalescing;

      if (!coalesce) {
        history = pushHistory(state.history, state.canvas);
        isCoalescing = false;
      } else if (!state.isCoalescing) {
        history = pushHistory(state.history, state.canvas);
        isCoalescing = true;
      }

      const nextElements = state.canvas.elements.map((el) =>
        el.id === id ? { ...el, x: Math.round(x), y: Math.round(y) } : el
      );

      return {
        ...state,
        canvas: { ...state.canvas, elements: nextElements },
        history,
        isCoalescing,
      };
    }

    case "RESIZE_ELEMENT": {
      const { id, width, height, x, y, rotation } = action.payload;
      const coalesce = Boolean(action.coalesce);

      let history = state.history;
      let isCoalescing = state.isCoalescing;

      if (!coalesce) {
        history = pushHistory(state.history, state.canvas);
        isCoalescing = false;
      } else if (!state.isCoalescing) {
        history = pushHistory(state.history, state.canvas);
        isCoalescing = true;
      }

      const nextElements = state.canvas.elements.map((el) => {
        if (el.id !== id) return el;
        const nextEl = { ...el, width: Math.max(5, Math.round(width)) };
        if (height !== undefined && el.type !== "text") {
          nextEl.height = Math.max(5, Math.round(height));
        }
        if (x !== undefined) nextEl.x = Math.round(x);
        if (y !== undefined) nextEl.y = Math.round(y);
        if (rotation !== undefined) nextEl.rotation = Math.round(rotation);
        return nextEl;
      });

      return {
        ...state,
        canvas: { ...state.canvas, elements: nextElements },
        history,
        isCoalescing,
      };
    }

    case "DELETE_ELEMENT": {
      const targetId = action.payload || state.selectedId;
      if (!targetId) return state;

      const history = pushHistory(state.history, state.canvas);
      const nextElements = state.canvas.elements.filter((el) => el.id !== targetId);

      return {
        ...state,
        canvas: { ...state.canvas, elements: nextElements },
        selectedId: state.selectedId === targetId ? null : state.selectedId,
        history,
        isCoalescing: false,
      };
    }

    case "DUPLICATE_ELEMENT": {
      const targetId = action.payload || state.selectedId;
      const target = state.canvas.elements.find((el) => el.id === targetId);
      if (!target) return state;

      const history = pushHistory(state.history, state.canvas);
      const newId = generateElementId(target.type);

      const offset = 20;
      const newX = Math.min(state.canvas.width - Math.min(target.width, state.canvas.width), target.x + offset);
      const newY = Math.min(
        state.canvas.height - Math.min(target.height || target.width, state.canvas.height),
        target.y + offset
      );

      const duplicate = {
        ...target,
        id: newId,
        x: newX,
        y: newY,
      };
      if (target.filters) {
        duplicate.filters = { ...target.filters };
      }

      return {
        ...state,
        canvas: { ...state.canvas, elements: [...state.canvas.elements, duplicate] },
        selectedId: newId,
        history,
        isCoalescing: false,
      };
    }

    case "REORDER_ELEMENT": {
      const { id, direction } = action.payload;
      const idx = state.canvas.elements.findIndex((el) => el.id === id);
      if (idx === -1) return state;

      const elements = [...state.canvas.elements];
      const [item] = elements.splice(idx, 1);

      if (direction === "up") {
        if (idx === state.canvas.elements.length - 1) return state;
        elements.splice(idx + 1, 0, item);
      } else if (direction === "down") {
        if (idx === 0) return state;
        elements.splice(idx - 1, 0, item);
      } else if (direction === "bringToFront") {
        elements.push(item);
      } else if (direction === "sendToBack") {
        elements.unshift(item);
      } else {
        return state;
      }

      const history = pushHistory(state.history, state.canvas);
      return {
        ...state,
        canvas: { ...state.canvas, elements },
        history,
        isCoalescing: false,
      };
    }

    case "SET_CANVAS_SIZE": {
      const { width, height } = action.payload;
      const w = Math.min(4000, Math.max(100, parseInt(width, 10) || 1080));
      const h = Math.min(4000, Math.max(100, parseInt(height, 10) || 1080));

      if (state.canvas.width === w && state.canvas.height === h) return state;

      const history = pushHistory(state.history, state.canvas);
      return {
        ...state,
        canvas: { ...state.canvas, width: w, height: h },
        history,
        isCoalescing: false,
      };
    }

    case "SET_CANVAS_BACKGROUND": {
      const bg = action.payload || "#FFFFFF";
      if (state.canvas.background === bg) return state;

      const history = pushHistory(state.history, state.canvas);
      return {
        ...state,
        canvas: { ...state.canvas, background: bg },
        history,
        isCoalescing: false,
      };
    }

    case "UNDO": {
      if (state.history.past.length === 0) return state;

      const newPast = [...state.history.past];
      const previousCanvas = newPast.pop();
      const newFuture = [cloneCanvas(state.canvas), ...state.history.future];

      // Keep selection if it still exists in the restored canvas
      const stillExists = previousCanvas.elements.some((el) => el.id === state.selectedId);

      return {
        ...state,
        canvas: previousCanvas,
        selectedId: stillExists ? state.selectedId : null,
        history: {
          past: newPast,
          future: newFuture,
        },
        isCoalescing: false,
      };
    }

    case "REDO": {
      if (state.history.future.length === 0) return state;

      const newFuture = [...state.history.future];
      const nextCanvas = newFuture.shift();
      const newPast = [...state.history.past, cloneCanvas(state.canvas)];

      const stillExists = nextCanvas.elements.some((el) => el.id === state.selectedId);

      return {
        ...state,
        canvas: nextCanvas,
        selectedId: stillExists ? state.selectedId : null,
        history: {
          past: newPast,
          future: newFuture,
        },
        isCoalescing: false,
      };
    }

    default:
      return state;
  }
}

import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import type { Note, ColorScheme, NoteStatus } from '../types';
import * as repo from '../lib/repository';
import { getSession } from '../lib/supabaseClient';

// ─── State ───────────────────────────────────────────────────────────────────

type State = {
  notes: Note[];
  loading: boolean;
  error: string | null;
  colorScheme: ColorScheme;
  isAnonymous: boolean;
};

const initialState: State = {
  notes: [],
  loading: false,
  error: null,
  colorScheme: 'system',
  isAnonymous: true,
};

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_NOTES'; payload: Note[] }
  | { type: 'ADD_NOTE'; payload: Note }
  | { type: 'UPDATE_NOTE'; payload: Note }
  | { type: 'REMOVE_NOTE'; payload: string }
  | { type: 'SET_COLOR_SCHEME'; payload: ColorScheme }
  | { type: 'SET_IS_ANONYMOUS'; payload: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_NOTES':
      return { ...state, notes: action.payload };
    case 'ADD_NOTE':
      return { ...state, notes: [action.payload, ...state.notes] };
    case 'UPDATE_NOTE':
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.payload.id ? action.payload : n
        ),
      };
    case 'REMOVE_NOTE':
      return { ...state, notes: state.notes.filter((n) => n.id !== action.payload) };
    case 'SET_COLOR_SCHEME':
      return { ...state, colorScheme: action.payload };
    case 'SET_IS_ANONYMOUS':
      return { ...state, isAnonymous: action.payload };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

type AppContextType = {
  state: State;
  loadAll: () => Promise<void>;
  createNote: (rawText?: string, sourceType?: 'voice' | 'text') => Promise<Note>;
  updateNote: (
    id: string,
    fields: Partial<{
      content: string;
      rawText: string;
      title: string | null;
      tags: string[];
      status: NoteStatus;
      isFavorite: boolean;
      emoji: string;
    }>
  ) => Promise<void>;
  toggleFavorite: (id: string, isFavorite: boolean) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  setColorScheme: (scheme: ColorScheme) => Promise<void>;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // staleなクロージャを避けるためstateRefで最新stateを参照
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const loadAll = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const session = await getSession();
      dispatch({ type: 'SET_IS_ANONYMOUS', payload: session?.user?.is_anonymous ?? true });
      const [notes, theme] = await Promise.all([
        repo.fetchNotes(),
        repo.getSetting('theme'),
      ]);
      dispatch({ type: 'SET_NOTES', payload: notes });
      if (theme) {
        dispatch({ type: 'SET_COLOR_SCHEME', payload: theme as ColorScheme });
      }
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: '読み込みに失敗しました' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const createNote = useCallback(async (rawText: string = '', sourceType: 'voice' | 'text' = 'text') => {
    const note = await repo.createNote(rawText, sourceType);
    dispatch({ type: 'ADD_NOTE', payload: note });
    return note;
  }, []);

  const updateNote = useCallback(async (
    id: string,
    fields: Partial<{
      content: string;
      rawText: string;
      title: string | null;
      tags: string[];
      status: NoteStatus;
      isFavorite: boolean;
      emoji: string;
    }>
  ) => {
    const note = await repo.updateNote(id, fields);
    dispatch({ type: 'UPDATE_NOTE', payload: note });
  }, []);

  const toggleFavorite = useCallback(async (id: string, isFavorite: boolean) => {
    const target = stateRef.current.notes.find((n) => n.id === id);
    if (!target) return;
    // Optimistic Update: 先に state を更新
    dispatch({ type: 'UPDATE_NOTE', payload: { ...target, isFavorite } });
    try {
      await repo.updateNote(id, { isFavorite });
    } catch {
      // 失敗時はロールバック
      dispatch({ type: 'UPDATE_NOTE', payload: target });
    }
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    await repo.deleteNote(id);
    dispatch({ type: 'REMOVE_NOTE', payload: id });
  }, []);

  const setColorScheme = useCallback(async (scheme: ColorScheme) => {
    dispatch({ type: 'SET_COLOR_SCHEME', payload: scheme });
    try {
      await repo.setSetting('theme', scheme);
    } catch {
      // 失敗時も state は維持（サイレント失敗）
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        loadAll,
        createNote,
        updateNote,
        toggleFavorite,
        deleteNote,
        setColorScheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

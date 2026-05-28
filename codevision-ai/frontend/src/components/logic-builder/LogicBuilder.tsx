'use client';

/**
 * Visual Logic Builder with drag-and-drop blocks.
 * Users arrange algorithm steps visually before converting to code.
 * Uses @dnd-kit for drag-and-drop functionality.
 */
import { motion } from 'framer-motion';
import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Language, LogicBlock } from '@/types';
import * as apiClient from '@/lib/api';
import CodeHighlight from '../code-editor/CodeHighlight';
import LoadingSpinner from '../ui/LoadingSpinner';

// Predefined logic blocks users can drag into their canvas
const AVAILABLE_BLOCKS: Array<{ type: LogicBlock['type']; label: string; icon: string; color: string }> = [
  { type: 'start', label: 'Start', icon: '🟢', color: 'border-green-500 bg-green-500/10' },
  { type: 'input', label: 'Read Input', icon: '📥', color: 'border-blue-500 bg-blue-500/10' },
  { type: 'variable', label: 'Set Variable', icon: '📦', color: 'border-purple-500 bg-purple-500/10' },
  { type: 'condition', label: 'If Condition', icon: '🔀', color: 'border-yellow-500 bg-yellow-500/10' },
  { type: 'loop', label: 'Loop', icon: '🔄', color: 'border-orange-500 bg-orange-500/10' },
  { type: 'operation', label: 'Operation', icon: '⚙', color: 'border-cyan-500 bg-cyan-500/10' },
  { type: 'function', label: 'Function Call', icon: '📞', color: 'border-indigo-500 bg-indigo-500/10' },
  { type: 'output', label: 'Print Output', icon: '📤', color: 'border-pink-500 bg-pink-500/10' },
  { type: 'end', label: 'End', icon: '🔴', color: 'border-red-500 bg-red-500/10' },
];

// Renders a single sortable block in the canvas
function SortableBlock({ block, onRemove, onUpdate }: {
  block: LogicBlock;
  onRemove: (id: string) => void;
  onUpdate: (id: string, label: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const config = AVAILABLE_BLOCKS.find(b => b.type === block.type);

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 ${config?.color || 'border-border'} mb-2`}>
        {/* Drag handle */}
        <span {...listeners} className="cursor-grab text-foreground/40 hover:text-foreground">⠿</span>
        <span className="text-lg">{config?.icon}</span>
        <input
          type="text"
          value={block.label}
          onChange={(e) => onUpdate(block.id, e.target.value)}
          className="flex-1 bg-transparent text-sm text-foreground border-none focus:outline-none"
          placeholder={`Describe this ${block.type} step...`}
        />
        <button
          onClick={() => onRemove(block.id)}
          className="text-foreground/30 hover:text-danger text-sm"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

interface LogicBuilderProps {
  language: Language;
}

export default function LogicBuilder({ language }: LogicBuilderProps) {
  const [blocks, setBlocks] = useState<LogicBlock[]>([]);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Add a new block to the canvas
  const addBlock = useCallback((type: LogicBlock['type']) => {
    const config = AVAILABLE_BLOCKS.find(b => b.type === type);
    const newBlock: LogicBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      label: config?.label || type,
      connections: [],
      params: {},
    };
    setBlocks(prev => [...prev, newBlock]);
  }, []);

  // Remove a block from the canvas
  const removeBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  }, []);

  // Update a block's label
  const updateBlock = useCallback((id: string, label: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, label } : b));
  }, []);

  // Handle drag-and-drop reordering
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks(prev => {
        const oldIndex = prev.findIndex(b => b.id === active.id);
        const newIndex = prev.findIndex(b => b.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  // Convert visual blocks to source code via AI
  const convertToCode = useCallback(async () => {
    if (blocks.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.visualToCode(blocks, language);
      setGeneratedCode(result.generatedCode);
      setExplanation(result.explanation);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setLoading(false);
    }
  }, [blocks, language]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground">Logic Builder</h2>
        <p className="text-sm text-foreground/60 mt-1">
          Build your algorithm visually by dragging blocks, then convert to code.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Block palette - available blocks to add */}
        <div className="lg:col-span-1">
          <h3 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-3">Available Blocks</h3>
          <div className="space-y-2">
            {AVAILABLE_BLOCKS.map((block) => (
              <motion.button
                key={block.type}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => addBlock(block.type)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 ${block.color} text-sm transition-all hover:shadow-md`}
              >
                <span className="text-lg">{block.icon}</span>
                <span className="text-foreground/80">{block.label}</span>
                <span className="ml-auto text-foreground/30 text-xs">+ Add</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Canvas - drop zone for arranging blocks */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Your Algorithm</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setBlocks([])}
                className="text-xs px-3 py-1 bg-surface-light text-foreground/60 rounded-lg hover:text-danger"
              >
                Clear All
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={convertToCode}
                disabled={blocks.length === 0 || loading}
                className="text-xs px-4 py-1.5 bg-primary text-white rounded-lg font-medium disabled:opacity-40"
              >
                Convert to Code
              </motion.button>
            </div>
          </div>

          <div className="bg-surface border-2 border-dashed border-border rounded-lg p-4 min-h-[400px]">
            {blocks.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-foreground/30 text-sm">
                Click blocks from the palette to build your algorithm
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  {blocks.map((block) => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      onRemove={removeBlock}
                      onUpdate={updateBlock}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && <LoadingSpinner message="Converting logic to code..." />}

      {/* Error */}
      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 text-sm text-danger">{error}</div>
      )}

      {/* Generated code output */}
      {generatedCode && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Generated Code ({language})</h3>
            <CodeHighlight code={generatedCode} language={language} />
          </div>
          {explanation && (
            <div className="bg-surface border border-border rounded-lg p-4">
              <h4 className="text-xs font-semibold text-foreground/70 uppercase mb-1">How Visual Logic Maps to Code</h4>
              <p className="text-sm text-foreground/70">{explanation}</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

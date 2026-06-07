import { useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, Flame, Clock, Save, Lock, Copy, ChevronDown } from 'lucide-react';
import { useProjectStore, useUIStore } from '@/stores';
import { generateId } from '@/lib/ingredientDict';
import type { RecipeStep, Ingredient, HeatLevel } from '@/types';
import { HEAT_LABELS, HEAT_COLORS, INGREDIENT_CATEGORIES } from '@/types';

const EMPTY_STEP: Omit<RecipeStep, 'id' | 'order'> = {
  name: '', description: '', heatLevel: 'medium', durationMinutes: 5,
  ingredientRefs: [], notes: '', isKeyNode: false,
};
const EMPTY_ING: Omit<Ingredient, 'id'> = {
  name: '', quantity: 0, unit: '克', unitPrice: 0, category: '其他',
};

function SortableStepCard({ step, index, onChange, onRemove, disabled }: {
  step: RecipeStep; index: number;
  onChange: (s: RecipeStep) => void; onRemove: () => void; disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="paper-card p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <button {...attributes} {...listeners} className="mt-1 cursor-grab text-smoke-light hover:text-paper" disabled={disabled}>
          <GripVertical size={18} />
        </button>
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-bronze font-bold text-sm w-6 shrink-0">{index + 1}.</span>
            <input className="ink-input flex-1" value={step.name} placeholder="步骤名称"
              onChange={e => onChange({ ...step, name: e.target.value })} disabled={disabled} />
            {step.isKeyNode && <span className="seal-badge text-xs">关键</span>}
            <button onClick={() => onChange({ ...step, isKeyNode: !step.isKeyNode })}
              className={`text-xs px-2 py-1 rounded border transition ${step.isKeyNode ? 'border-vermilion text-vermilion' : 'border-smoke text-smoke-light hover:border-bronze hover:text-bronze'}`}
              disabled={disabled}>关键节点</button>
            <button onClick={onRemove} className="text-smoke-light hover:text-vermilion transition" disabled={disabled}>
              <Trash2 size={16} />
            </button>
          </div>
          <textarea className="ink-input min-h-[48px] resize-y" value={step.description} placeholder="步骤描述"
            onChange={e => onChange({ ...step, description: e.target.value })} disabled={disabled} rows={2} />
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Flame size={14} style={{ color: HEAT_COLORS[step.heatLevel] }} />
              <select className="ink-input w-24" value={step.heatLevel}
                onChange={e => onChange({ ...step, heatLevel: e.target.value as HeatLevel })} disabled={disabled}>
                {(Object.entries(HEAT_LABELS) as [HeatLevel, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: HEAT_COLORS[step.heatLevel] }} />
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-smoke-light" />
              <input type="number" className="ink-input w-20" min={0} value={step.durationMinutes}
                onChange={e => onChange({ ...step, durationMinutes: Math.max(0, Number(e.target.value)) })} disabled={disabled} />
              <span className="text-smoke-light text-sm">分钟</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Recipe() {
  const { currentVersion, currentProject, recipeVersions, updateSteps, updateIngredients, saveCurrentVersion, createVersion, selectVersion } = useProjectStore();
  const addToast = useUIStore(s => s.addToast);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  if (!currentVersion) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-smoke-light">
        <p>请先选择一个项目</p>
      </div>
    );
  }

  const locked = currentVersion.locked;
  const steps = currentVersion.steps;
  const ingredients = currentVersion.ingredients;

  const handleDragEnd = (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = steps.findIndex(s => s.id === active.id);
    const newIdx = steps.findIndex(s => s.id === over.id);
    const reordered = steps.map((s, i) => ({ ...s, order: i }));
    const [moved] = reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, moved);
    updateSteps(reordered.map((s, i) => ({ ...s, order: i })));
  };

  const updateStep = (updated: RecipeStep) => {
    updateSteps(steps.map(s => s.id === updated.id ? updated : s));
  };

  const removeStep = (id: string) => {
    updateSteps(steps.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i })));
  };

  const addStep = () => {
    const newStep: RecipeStep = { ...EMPTY_STEP, id: generateId(), order: steps.length };
    updateSteps([...steps, newStep]);
  };

  const updateIngredient = (updated: Ingredient) => {
    updateIngredients(ingredients.map(i => i.id === updated.id ? updated : i));
  };

  const removeIngredient = (id: string) => {
    updateIngredients(ingredients.filter(i => i.id !== id));
  };

  const addIngredient = () => {
    updateIngredients([...ingredients, { ...EMPTY_ING, id: generateId() }]);
  };

  const handleSave = async () => {
    setSaving(true);
    await saveCurrentVersion();
    setSaving(false);
  };

  const handleCreateVersion = async () => {
    if (!currentVersion) return;
    setCreating(true);
    try {
      await createVersion(currentVersion);
      addToast(`已创建新版本`, 'success');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-calligraphy text-3xl text-paper">{currentVersion.name}</h1>
          {locked && (
            <span className="flex items-center gap-1 text-vermilion text-sm"><Lock size={14} /> 已锁定</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {recipeVersions.length > 1 && (
            <div className="flex items-center gap-2">
              <select
                className="ink-input w-48"
                value={currentVersion.id}
                onChange={e => selectVersion(e.target.value)}
              >
                {recipeVersions.map(v => (
                  <option key={v.id} value={v.id}>
                    第{v.versionNumber}版{v.locked ? ' 🔒' : ''} — {v.steps.length}步/{v.ingredients.length}种食材
                  </option>
                ))}
              </select>
            </div>
          )}
          <button onClick={handleCreateVersion} disabled={creating}
            className="ink-btn ink-btn-ghost text-sm disabled:opacity-40">
            <Copy size={14} /> {creating ? '创建中...' : '新建版本'}
          </button>
          <button onClick={handleSave} disabled={saving || locked}
            className="ink-btn ink-btn-secondary disabled:opacity-40">
            <Save size={16} /> {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-calligraphy text-xl text-paper">步骤卡片</h2>
          <button onClick={addStep} disabled={locked}
            className="ink-btn ink-btn-ghost text-sm disabled:opacity-40">
            <Plus size={14} /> 添加步骤
          </button>
        </div>
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <SortableStepCard key={step.id} step={step} index={i}
                  onChange={updateStep} onRemove={() => removeStep(step.id)} disabled={locked} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        {steps.length === 0 && (
          <div className="drop-zone p-8 text-center text-smoke-light text-sm">
            暂无步骤，点击"添加步骤"开始
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-calligraphy text-xl text-paper">食材用量表</h2>
          <button onClick={addIngredient} disabled={locked}
            className="ink-btn ink-btn-ghost text-sm disabled:opacity-40">
            <Plus size={14} /> 添加食材
          </button>
        </div>
        {ingredients.length > 0 ? (
          <div className="paper-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-paper/10 text-left text-smoke-light">
                  <th className="px-4 py-2 font-normal">食材</th>
                  <th className="px-4 py-2 font-normal">用量</th>
                  <th className="px-4 py-2 font-normal">单位</th>
                  <th className="px-4 py-2 font-normal">单价</th>
                  <th className="px-4 py-2 font-normal">分类</th>
                  <th className="px-4 py-2 font-normal w-10"></th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map(ing => (
                  <tr key={ing.id} className="border-b border-paper/5 hover:bg-paper/5 transition">
                    <td className="px-4 py-2"><input className="ink-input" value={ing.name}
                      onChange={e => updateIngredient({ ...ing, name: e.target.value })} disabled={locked} /></td>
                    <td className="px-4 py-2"><input type="number" className="ink-input" min={0} value={ing.quantity}
                      onChange={e => updateIngredient({ ...ing, quantity: Number(e.target.value) })} disabled={locked} /></td>
                    <td className="px-4 py-2"><input className="ink-input w-16" value={ing.unit}
                      onChange={e => updateIngredient({ ...ing, unit: e.target.value })} disabled={locked} /></td>
                    <td className="px-4 py-2"><input type="number" className="ink-input w-20" min={0} step={0.1} value={ing.unitPrice}
                      onChange={e => updateIngredient({ ...ing, unitPrice: Number(e.target.value) })} disabled={locked} /></td>
                    <td className="px-4 py-2">
                      <select className="ink-input" value={ing.category}
                        onChange={e => updateIngredient({ ...ing, category: e.target.value })} disabled={locked}>
                        {INGREDIENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => removeIngredient(ing.id)} disabled={locked}
                        className="text-smoke-light hover:text-vermilion transition disabled:opacity-40">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="drop-zone p-8 text-center text-smoke-light text-sm">
            暂无食材，点击"添加食材"开始
          </div>
        )}
      </section>
    </div>
  );
}

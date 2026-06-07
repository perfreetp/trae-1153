import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Calculator, Download, Printer, PieChart as PieChartIcon, Users } from 'lucide-react';
import { useProjectStore, useUIStore } from '@/stores';
import { INGREDIENT_CATEGORIES } from '@/types';

const PIE_COLORS = ['#c0392b', '#2d6a4f', '#b8860b', '#daa520', '#40916c', '#6a6a7a', '#e74c3c', '#4a4a5a', '#e8e0d0'];

export default function Cost() {
  const { currentVersion, currentProject, updateIngredients, saveCurrentVersion } = useProjectStore();
  const addToast = useUIStore(s => s.addToast);
  const [servings, setServings] = useState(1);
  const [showOrder, setShowOrder] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');

  const ingredients = currentVersion?.ingredients ?? [];
  const totalCost = useMemo(() => ingredients.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0), [ingredients]);
  const costPerServing = servings > 0 ? totalCost / servings : 0;

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    ingredients.forEach(i => {
      const sub = i.quantity * i.unitPrice;
      map.set(i.category, (map.get(i.category) ?? 0) + sub);
    });
    return Array.from(map.entries())
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
  }, [ingredients]);

  const handlePriceChange = (id: string, newPrice: number) => {
    const updated = ingredients.map(i => i.id === id ? { ...i, unitPrice: newPrice } : i);
    updateIngredients(updated);
  };

  const handlePriceBlur = () => {
    if (editingPriceId) {
      handlePriceChange(editingPriceId, Number(priceInput) || 0);
      setEditingPriceId(null);
    }
  };

  const handleSave = async () => {
    await saveCurrentVersion();
    addToast('成本数据已保存', 'success');
  };

  if (!currentProject || !currentVersion) {
    return (
      <div className="flex items-center justify-center h-full">
        <p style={{ color: 'var(--smoke-light)' }}>请先选择一个项目</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-calligraphy text-3xl" style={{ color: 'var(--bronze)' }}>采购成本</h1>
        <button onClick={handleSave} className="ink-btn ink-btn-secondary">
          <Calculator size={16} /> 保存
        </button>
      </div>

      <section className="paper-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold" style={{ color: 'var(--vermilion)' }}>
          <Calculator size={20} /> 食材价格表
        </div>
        {ingredients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgba(245,240,232,0.1)', color: 'var(--smoke-light)' }}>
                  <th className="px-3 py-2 font-normal text-left">食材</th>
                  <th className="px-3 py-2 font-normal text-left">分类</th>
                  <th className="px-3 py-2 font-normal text-right">用量</th>
                  <th className="px-3 py-2 font-normal text-left">单位</th>
                  <th className="px-3 py-2 font-normal text-right">单价(元)</th>
                  <th className="px-3 py-2 font-normal text-right">小计(元)</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map(ing => (
                  <tr key={ing.id} className="border-b transition hover:bg-white/5" style={{ borderColor: 'rgba(245,240,232,0.05)' }}>
                    <td className="px-3 py-2" style={{ color: 'var(--paper)' }}>{ing.name}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--bamboo)' }}>{ing.category}</td>
                    <td className="px-3 py-2 text-right" style={{ color: 'var(--paper)' }}>{ing.quantity}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--smoke-light)' }}>{ing.unit}</td>
                    <td className="px-3 py-2 text-right">
                      {editingPriceId === ing.id ? (
                        <input
                          type="number"
                          className="ink-input w-20 text-right"
                          min={0}
                          step={0.1}
                          value={priceInput}
                          onChange={e => setPriceInput(e.target.value)}
                          onBlur={handlePriceBlur}
                          onKeyDown={e => e.key === 'Enter' && handlePriceBlur()}
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-pointer underline decoration-dashed underline-offset-2"
                          style={{ color: 'var(--bronze)' }}
                          onClick={() => { setEditingPriceId(ing.id); setPriceInput(String(ing.unitPrice)); }}
                        >
                          {ing.unitPrice}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--vermilion)' }}>
                      {(ing.quantity * ing.unitPrice).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-right font-semibold" style={{ color: 'var(--paper)' }}>合计</td>
                  <td className="px-3 py-3 text-right font-bold text-lg" style={{ color: 'var(--vermilion)' }}>
                    ¥{totalCost.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--smoke-light)' }}>暂无食材数据，请先在菜谱页添加食材</p>
        )}
      </section>

      <section className="paper-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold" style={{ color: 'var(--bamboo)' }}>
          <PieChartIcon size={20} /> 成本估算
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="space-y-1">
            <p className="text-sm" style={{ color: 'var(--smoke-light)' }}>总成本</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--vermilion)' }}>¥{totalCost.toFixed(2)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Users size={16} style={{ color: 'var(--bamboo)' }} />
            <span className="text-sm" style={{ color: 'var(--smoke-light)' }}>份数</span>
            <input
              type="number"
              className="ink-input w-20"
              min={1}
              value={servings}
              onChange={e => setServings(Math.max(1, Number(e.target.value)))}
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm" style={{ color: 'var(--smoke-light)' }}>每份成本</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--bronze)' }}>¥{costPerServing.toFixed(2)}</p>
          </div>
        </div>
        {categoryData.length > 0 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `¥${v.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="paper-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold" style={{ color: 'var(--bronze)' }}>
          <Download size={20} /> 采购单生成
        </div>
        <button onClick={() => setShowOrder(true)} className="ink-btn ink-btn-primary">
          <Printer size={16} /> 生成采购单
        </button>
      </section>

      {showOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="paper-card p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" style={{ background: 'var(--paper)', color: '#333' }}>
            <div id="print-area">
              <h2 className="font-calligraphy text-2xl text-center mb-1" style={{ color: '#1a1a1a' }}>采购单</h2>
              <p className="text-center text-sm mb-4" style={{ color: '#666' }}>{currentProject.name} · {new Date().toLocaleDateString('zh-CN')}</p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ borderBottom: '2px solid #333' }}>
                    <th className="px-2 py-1 text-left">食材</th>
                    <th className="px-2 py-1 text-left">分类</th>
                    <th className="px-2 py-1 text-right">用量</th>
                    <th className="px-2 py-1 text-right">单价</th>
                    <th className="px-2 py-1 text-right">小计</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map(ing => (
                    <tr key={ing.id} style={{ borderBottom: '1px solid #ccc' }}>
                      <td className="px-2 py-1">{ing.name}</td>
                      <td className="px-2 py-1">{ing.category}</td>
                      <td className="px-2 py-1 text-right">{ing.quantity}{ing.unit}</td>
                      <td className="px-2 py-1 text-right">¥{ing.unitPrice}</td>
                      <td className="px-2 py-1 text-right">¥{(ing.quantity * ing.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #333' }}>
                    <td colSpan={4} className="px-2 py-2 text-right font-bold">合计</td>
                    <td className="px-2 py-2 text-right font-bold" style={{ color: '#c0392b' }}>¥{totalCost.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex justify-end gap-3 mt-4 print:hidden">
              <button onClick={() => window.print()} className="ink-btn ink-btn-secondary">
                <Printer size={16} /> 打印
              </button>
              <button onClick={() => addToast('PDF导出功能准备中', 'info')} className="ink-btn ink-btn-primary">
                <Download size={16} /> 导出PDF
              </button>
              <button onClick={() => setShowOrder(false)} className="ink-btn ink-btn-ghost">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

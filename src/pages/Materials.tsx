import { useState, useRef, useCallback } from 'react';
import { Image, FileText, Sparkles, Plus, X, Upload } from 'lucide-react';
import { useProjectStore } from '@/stores';
import { extractIngredients, generateId } from '@/lib/ingredientDict';
import type { Material } from '@/types';

export default function Materials() {
  const { currentProject, materials, addMaterial, removeMaterial } = useProjectStore();
  const [textContent, setTextContent] = useState('');
  const [extractedIngredients, setExtractedIngredients] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const photos = materials.filter(m => m.type === 'photo');
  const texts = materials.filter(m => m.type === 'text');

  const handleFiles = useCallback(async (files: FileList) => {
    if (!currentProject) return;
    for (const file of Array.from(files)) {
      if (!file.type.match(/^image\/(jpeg|png)$/)) continue;
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        const material: Material = {
          id: generateId(),
          projectId: currentProject.id,
          type: 'photo',
          content: dataUrl,
          thumbnail: dataUrl,
          extractedIngredients: [],
          createdAt: new Date().toISOString(),
        };
        await addMaterial(material);
      };
      reader.readAsDataURL(file);
    }
  }, [currentProject, addMaterial]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleSaveText = async () => {
    if (!currentProject || !textContent.trim()) return;
    const material: Material = {
      id: generateId(),
      projectId: currentProject.id,
      type: 'text',
      content: textContent.trim(),
      extractedIngredients: [],
      createdAt: new Date().toISOString(),
    };
    await addMaterial(material);
    setTextContent('');
  };

  const handleExtract = () => {
    const allText = texts.map(m => m.content).join(' ');
    setExtractedIngredients(extractIngredients(allText));
  };

  const handleAddManual = () => {
    const name = manualInput.trim();
    if (!name) return;
    setExtractedIngredients(prev => prev.includes(name) ? prev : [...prev, name]);
    setManualInput('');
  };

  const handleRemoveIngredient = (name: string) => {
    setExtractedIngredients(prev => prev.filter(i => i !== name));
  };

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <p style={{ color: 'var(--smoke-light)' }}>请先选择一个项目</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="font-calligraphy text-3xl" style={{ color: 'var(--bronze)' }}>素材库</h1>

      <section className="paper-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold" style={{ color: 'var(--vermilion)' }}>
          <Image size={20} /> 照片导入区
        </div>
        <div
          className={`drop-zone p-8 flex flex-col items-center justify-center gap-2 cursor-pointer ${dragActive ? 'active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={32} style={{ color: 'var(--smoke-light)' }} />
          <p style={{ color: 'var(--smoke-light)' }}>拖放 JPG/PNG 照片至此处，或点击选择</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
        {photos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {photos.map(p => (
              <div key={p.id} className="relative group rounded overflow-hidden" style={{ border: '1px solid rgba(245,240,232,0.1)' }}>
                <img src={p.content} alt="" className="w-full h-24 object-cover" />
                <button
                  onClick={() => removeMaterial(p.id)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                  style={{ background: 'var(--vermilion)', color: 'var(--paper)' }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="paper-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold" style={{ color: 'var(--bamboo)' }}>
          <FileText size={20} /> 口述文本区
        </div>
        <textarea
          value={textContent}
          onChange={e => setTextContent(e.target.value)}
          placeholder="输入口述菜谱描述文本……"
          className="ink-input min-h-[100px] resize-y"
          rows={4}
        />
        <button onClick={handleSaveText} className="ink-btn ink-btn-secondary" disabled={!textContent.trim()}>
          保存文本
        </button>
        {texts.length > 0 && (
          <div className="space-y-2">
            {texts.map(t => (
              <div key={t.id} className="flex items-start gap-2 p-3 rounded" style={{ background: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.08)' }}>
                <p className="flex-1 text-sm line-clamp-2" style={{ color: 'var(--paper)' }}>{t.content}</p>
                <button onClick={() => removeMaterial(t.id)} className="shrink-0 p-1 rounded hover:opacity-80" style={{ color: 'var(--vermilion)' }}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="paper-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold" style={{ color: 'var(--bronze)' }}>
          <Sparkles size={20} /> 食材提取面板
        </div>
        <button onClick={handleExtract} className="ink-btn ink-btn-primary" disabled={texts.length === 0}>
          <Sparkles size={16} /> 提取食材
        </button>
        {extractedIngredients.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {extractedIngredients.map(name => (
              <span key={name} className="seal-badge animate-seal">
                {name}
                <button onClick={() => handleRemoveIngredient(name)} className="ml-1 hover:opacity-70">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddManual()}
            placeholder="手动添加食材"
            className="ink-input flex-1"
          />
          <button onClick={handleAddManual} className="ink-btn ink-btn-ghost">
            <Plus size={16} /> 添加
          </button>
        </div>
      </section>
    </div>
  );
}

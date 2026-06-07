import { useState, useRef, useCallback } from 'react';
import { Archive, Upload, FileText, Download, Package, Eye, Trash2, BookOpen } from 'lucide-react';
import { useProjectStore } from '@/stores';
import { useUIStore } from '@/stores';
import { generateId } from '@/lib/ingredientDict';
import type { ArchiveDoc } from '@/types';

const TYPE_BADGE: Record<ArchiveDoc['type'], { label: string; color: string }> = {
  authorization: { label: '授权书', color: 'var(--vermilion)' },
  proof: { label: '证明', color: 'var(--bamboo)' },
  other: { label: '其他', color: 'var(--smoke-light)' },
};

export default function ArchivePage() {
  const { currentProject, currentVersion, archive, recipeVersions, materials, trials, reviews, saveArchiveData } = useProjectStore();
  const addToast = useUIStore(s => s.addToast);
  const [docType, setDocType] = useState<ArchiveDoc['type']>('authorization');
  const [dragActive, setDragActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const docs = archive?.documents ?? [];

  const ensureArchive = () => {
    if (!currentProject) return null;
    if (archive) return archive;
    return {
      id: generateId(),
      projectId: currentProject.id,
      documents: [],
      lectureExported: false,
      archivedAt: new Date().toISOString(),
    };
  };

  const handleFiles = useCallback(async (files: FileList) => {
    const base = ensureArchive();
    if (!base || !currentProject) return;
    const newDocs: ArchiveDoc[] = Array.from(files).map(f => ({
      id: generateId(),
      name: f.name,
      type: docType,
      content: f.name,
      uploadedAt: new Date().toISOString(),
    }));
    const updated = { ...base, documents: [...base.documents, ...newDocs] };
    await saveArchiveData(updated);
  }, [currentProject, archive, docType, saveArchiveData]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDelete = async (id: string) => {
    const base = ensureArchive();
    if (!base) return;
    const updated = { ...base, documents: base.documents.filter(d => d.id !== id) };
    await saveArchiveData(updated);
  };

  const handleExportLecture = async () => {
    const base = ensureArchive();
    if (!base) return;
    await saveArchiveData({ ...base, lectureExported: true });
    addToast('教学讲义已导出', 'success');
  };

  const handlePackageProject = () => {
    if (!currentProject) return;
    const data = {
      project: currentProject,
      materials,
      recipeVersions,
      trials,
      reviews,
      archive,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name}-归档.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('项目资料已打包下载', 'success');
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
      <h1 className="font-calligraphy text-3xl" style={{ color: 'var(--bronze)' }}>资料归档</h1>

      <section className="paper-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold" style={{ color: 'var(--vermilion)' }}>
          <FileText size={20} /> 授权材料
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: 'var(--smoke-light)' }}>文件类型：</span>
          {(['authorization', 'proof', 'other'] as const).map(t => (
            <button
              key={t}
              onClick={() => setDocType(t)}
              className="ink-btn text-xs"
              style={{
                background: docType === t ? TYPE_BADGE[t].color : 'transparent',
                color: docType === t ? 'var(--paper)' : TYPE_BADGE[t].color,
                border: `1px solid ${TYPE_BADGE[t].color}`,
              }}
            >
              {TYPE_BADGE[t].label}
            </button>
          ))}
        </div>
        <div
          className={`drop-zone p-8 flex flex-col items-center justify-center gap-2 cursor-pointer ${dragActive ? 'active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={32} style={{ color: 'var(--smoke-light)' }} />
          <p style={{ color: 'var(--smoke-light)' }}>拖放授权书、传承证明等文件至此，或点击选择</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
        {docs.length > 0 && (
          <div className="space-y-2">
            {docs.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded" style={{ background: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.08)' }}>
                <FileText size={16} style={{ color: 'var(--smoke-light)' }} />
                <span className="flex-1 text-sm" style={{ color: 'var(--paper)' }}>{d.name}</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ color: TYPE_BADGE[d.type].color, border: `1px solid ${TYPE_BADGE[d.type].color}` }}>
                  {TYPE_BADGE[d.type].label}
                </span>
                <span className="text-xs" style={{ color: 'var(--smoke-light)' }}>{new Date(d.uploadedAt).toLocaleDateString()}</span>
                <button onClick={() => handleDelete(d.id)} className="p-1 rounded hover:opacity-80" style={{ color: 'var(--vermilion)' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="paper-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold" style={{ color: 'var(--bamboo)' }}>
          <BookOpen size={20} /> 讲义导出
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowPreview(v => !v)} className="ink-btn ink-btn-ghost">
            <Eye size={16} /> {showPreview ? '收起预览' : '预览讲义'}
          </button>
          <button onClick={handleExportLecture} className="ink-btn ink-btn-secondary">
            <Download size={16} /> 导出讲义
          </button>
        </div>
        {showPreview && (
          <div className="p-4 rounded space-y-3 animate-fade-in" style={{ background: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.1)' }}>
            <div className="font-calligraphy text-xl" style={{ color: 'var(--bronze)' }}>
              {currentProject.name}{currentVersion ? ` — 第${currentVersion.versionNumber}版` : ''}
            </div>
            {currentVersion && currentVersion.ingredients.length > 0 && (
              <div>
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--paper)' }}>食材清单</div>
                <div className="flex flex-wrap gap-2">
                  {currentVersion.ingredients.map(ing => (
                    <span key={ing.id} className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(45,106,79,0.15)', color: 'var(--bamboo-light)' }}>
                      {ing.name} {ing.quantity}{ing.unit}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {currentVersion && currentVersion.steps.length > 0 && (
              <div>
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--paper)' }}>工序步骤</div>
                <ol className="space-y-1 list-decimal list-inside text-sm" style={{ color: 'var(--paper)' }}>
                  {currentVersion.steps.map(s => (
                    <li key={s.id}>{s.name}：{s.description}</li>
                  ))}
                </ol>
              </div>
            )}
            {currentVersion && currentVersion.ingredients.length > 0 && (
              <div>
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--paper)' }}>成本概要</div>
                <p className="text-sm" style={{ color: 'var(--bronze-light)' }}>
                  合计：¥{currentVersion.ingredients.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="paper-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold" style={{ color: 'var(--bronze)' }}>
          <Package size={20} /> 项目打包
        </div>
        <p className="text-sm" style={{ color: 'var(--smoke-light)' }}>
          一键打包项目全部数据（项目信息、素材、菜谱版本、试做记录、评审、归档），下载为 JSON 文件。
        </p>
        <button onClick={handlePackageProject} className="ink-btn ink-btn-primary">
          <Archive size={16} /> 一键打包
        </button>
      </section>
    </div>
  );
}

import { useState, useRef, useCallback } from 'react';
import { Archive, Upload, FileText, Download, Package, Eye, Trash2, BookOpen, CheckCircle } from 'lucide-react';
import { useProjectStore, useUIStore } from '@/stores';
import { generateId } from '@/lib/ingredientDict';
import type { ArchiveDoc } from '@/types';
import { HEAT_LABELS } from '@/types';

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
  const importInputRef = useRef<HTMLInputElement>(null);

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

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = useCallback(async (files: FileList) => {
    const base = ensureArchive();
    if (!base || !currentProject) return;
    const newDocs: ArchiveDoc[] = [];
    for (const f of Array.from(files)) {
      const content = await readFileAsDataUrl(f);
      newDocs.push({
        id: generateId(),
        name: f.name,
        type: docType,
        content,
        uploadedAt: new Date().toISOString(),
      });
    }
    const updated = { ...base, documents: [...base.documents, ...newDocs] };
    await saveArchiveData(updated);
    addToast(`已上传 ${newDocs.length} 个文件`, 'success');
  }, [currentProject, archive, docType, saveArchiveData, addToast]);

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

  const buildLectureHtml = () => {
    if (!currentProject) return '';
    const version = currentVersion || recipeVersions[recipeVersions.length - 1];
    const totalCost = version ? version.ingredients.reduce((s, i) => s + i.quantity * i.unitPrice, 0) : 0;
    const successTrials = trials.filter(t => t.result === 'success');
    const failTrials = trials.filter(t => t.result === 'fail');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${currentProject.name} - 教学讲义</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap');
  body{font-family:'Noto Serif SC',serif;max-width:800px;margin:0 auto;padding:40px 32px;color:#1a1a2e;background:#f5f0e8;line-height:1.8;}
  h1{font-size:28px;text-align:center;border-bottom:3px double #b8860b;padding-bottom:16px;margin-bottom:8px;}
  .subtitle{text-align:center;color:#6a6a7a;font-size:14px;margin-bottom:32px;}
  h2{font-size:20px;color:#c0392b;border-left:4px solid #c0392b;padding-left:12px;margin-top:32px;}
  table{width:100%;border-collapse:collapse;margin:12px 0;}
  th,td{border:1px solid #d0c8b8;padding:8px 12px;text-align:left;font-size:14px;}
  th{background:#e8e0d0;color:#1a1a2e;font-weight:600;}
  .step{margin:12px 0;padding:12px 16px;background:#fff;border-left:4px solid #2d6a4f;}
  .step-name{font-weight:700;color:#2d6a4f;}
  .heat{display:inline-block;padding:2px 8px;border-radius:3px;font-size:12px;font-weight:600;color:#fff;}
  .heat-low{background:#2d6a4f;}.heat-medium{background:#b8860b;}.heat-high{background:#c0392b;}.heat-very_high{background:#e74c3c;}
  .conclusion{padding:16px;background:#fff;border:2px solid #b8860b;margin-top:24px;}
  .footer{text-align:center;color:#6a6a7a;font-size:12px;margin-top:40px;border-top:1px solid #d0c8b8;padding-top:16px;}
</style>
</head>
<body>
<h1>${currentProject.name}</h1>
<div class="subtitle">失传菜谱复原 · 教学讲义${version ? ` · 第${version.versionNumber}版` : ''}</div>

<h2>一、食材用量</h2>
${version && version.ingredients.length > 0 ? `<table><tr><th>食材</th><th>用量</th><th>单位</th><th>分类</th><th>单价(元)</th><th>小计(元)</th></tr>
${version.ingredients.map(i => `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${i.unit}</td><td>${i.category}</td><td>${i.unitPrice.toFixed(2)}</td><td>${(i.quantity * i.unitPrice).toFixed(2)}</td></tr>`).join('\n')}
<tr><td colspan="5" style="text-align:right;font-weight:700;">合计</td><td style="font-weight:700;color:#c0392b;">¥${totalCost.toFixed(2)}</td></tr></table>` : '<p>暂无食材数据</p>'}

<h2>二、工序步骤</h2>
${version && version.steps.length > 0 ? version.steps.map((s, i) => `<div class="step">
<div class="step-name">${i + 1}. ${s.name}</div>
<div>${s.description}</div>
<div style="margin-top:6px;">
<span class="heat heat-${s.heatLevel}">${HEAT_LABELS[s.heatLevel]}</span>
<span style="margin-left:12px;">时长：${s.durationMinutes} 分钟</span>
${s.isKeyNode ? '<span style="margin-left:12px;color:#c0392b;font-weight:700;">★ 关键节点</span>' : ''}
</div>
${s.notes ? `<div style="margin-top:4px;color:#6a6a7a;font-size:13px;">备注：${s.notes}</div>` : ''}
</div>`).join('\n') : '<p>暂无工序步骤</p>'}

<h2>三、试做结论</h2>
<p>总试做次数：${trials.length} 次｜成功：${successTrials.length} 次｜失败：${failTrials.length} 次</p>
${trials.length > 0 ? `<table><tr><th>轮次</th><th>日期</th><th>结果</th><th>失败原因</th><th>备注</th></tr>
${trials.map(t => `<tr><td>第${t.round}轮</td><td>${new Date(t.trialDate).toLocaleDateString('zh-CN')}</td><td style="color:${t.result === 'success' ? '#2d6a4f' : t.result === 'fail' ? '#c0392b' : '#b8860b'}">${t.result === 'success' ? '成功' : t.result === 'fail' ? '失败' : '部分成功'}</td><td>${t.failReason || '-'}</td><td>${t.notes || '-'}</td></tr>`).join('\n')}</table>` : '<p>暂无试做记录</p>'}

<h2>四、成本概要</h2>
<div class="conclusion">
<p>食材总成本：<strong style="color:#c0392b;">¥${totalCost.toFixed(2)}</strong></p>
<p>食材种类：${version ? version.ingredients.length : 0} 种</p>
<p>工序总时长：${version ? version.steps.reduce((s, st) => s + st.durationMinutes, 0) : 0} 分钟</p>
</div>

<div class="footer">古味寻踪 · 失传菜谱复原工作台 · ${new Date().toLocaleDateString('zh-CN')} 生成</div>
</body></html>`;
  };

  const handleExportLecture = async () => {
    const base = ensureArchive();
    if (!base) return;
    const html = buildLectureHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject?.name || '讲义'}-教学讲义.html`;
    a.click();
    URL.revokeObjectURL(url);
    await saveArchiveData({ ...base, lectureExported: true });
    addToast('教学讲义已导出下载', 'success');
  };

  const handlePackageProject = () => {
    if (!currentProject) return;
    const data = {
      _meta: { exportedAt: new Date().toISOString(), app: '古味寻踪' },
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
    a.download = `${currentProject.name}-归档包.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('项目资料已打包下载（含附件数据）', 'success');
  };

  const handleImportArchive = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentProject) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data._meta || data._meta.app !== '古味寻踪') {
        addToast('无效的归档文件', 'error');
        return;
      }
      const { saveProject, saveRecipeVersion: srv, saveTrial: st, saveReview: sr, saveMaterial: sm, saveArchive: sa } = await import('@/lib/database');
      if (data.project) await saveProject({ ...data.project, id: currentProject.id });
      if (data.materials) for (const m of data.materials) await sm({ ...m, projectId: currentProject.id });
      if (data.recipeVersions) for (const v of data.recipeVersions) await srv({ ...v, projectId: currentProject.id });
      if (data.trials) for (const t of data.trials) await st({ ...t, projectId: currentProject.id });
      if (data.reviews) for (const r of data.reviews) await sr({ ...r, projectId: currentProject.id });
      if (data.archive) await sa({ ...data.archive, projectId: currentProject.id });
      addToast('归档数据已导入，请刷新页面', 'success');
    } catch {
      addToast('导入失败：文件格式错误', 'error');
    }
    e.target.value = '';
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
          <p className="text-xs" style={{ color: 'var(--smoke)' }}>文件内容将完整保存到归档包中</p>
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
                {d.content.startsWith('data:') && (
                  <a href={d.content} download={d.name} className="text-xs" style={{ color: 'var(--bamboo-light)' }}>下载</a>
                )}
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
        <div className="flex gap-3 items-center">
          <button onClick={() => setShowPreview(v => !v)} className="ink-btn ink-btn-ghost">
            <Eye size={16} /> {showPreview ? '收起预览' : '预览讲义'}
          </button>
          <button onClick={handleExportLecture} className="ink-btn ink-btn-secondary">
            <Download size={16} /> 导出讲义
          </button>
          {archive?.lectureExported && (
            <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--bamboo)' }}>
              <CheckCircle size={14} /> 已导出
            </span>
          )}
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
                    <li key={s.id}>{s.name}（{HEAT_LABELS[s.heatLevel]}、{s.durationMinutes}分钟）：{s.description}</li>
                  ))}
                </ol>
              </div>
            )}
            {trials.length > 0 && (
              <div>
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--paper)' }}>试做结论</div>
                <p className="text-sm" style={{ color: 'var(--smoke-light)' }}>
                  共{trials.length}轮试做，成功{trials.filter(t => t.result === 'success').length}轮
                </p>
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
          一键打包项目全部数据（含附件文件内容），下载为 JSON 文件。可重新导入恢复所有信息。
        </p>
        <div className="flex gap-3">
          <button onClick={handlePackageProject} className="ink-btn ink-btn-primary">
            <Archive size={16} /> 一键打包
          </button>
          <button onClick={() => importInputRef.current?.click()} className="ink-btn ink-btn-ghost">
            <Upload size={16} /> 导入归档
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportArchive}
          />
        </div>
      </section>
    </div>
  );
}

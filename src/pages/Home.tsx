import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, FlaskConical, Star, Archive, Download, Upload, HardDrive, AlertTriangle } from 'lucide-react';
import { useProjectStore, useUIStore } from '@/stores';
import { generateId } from '@/lib/ingredientDict';
import type { Project } from '@/types';

const STATUS_MAP: Record<Project['status'], { label: string; cls: string }> = {
  draft: { label: '草稿', cls: '' },
  in_progress: { label: '进行中', cls: '' },
  review: { label: '评审中', cls: '' },
  completed: { label: '已完成', cls: 'seal-badge-success' },
  archived: { label: '已归档', cls: 'seal-badge-success' },
};

export default function Home() {
  const navigate = useNavigate();
  const { projects, currentProject, loadProjects, createProject, selectProject } = useProjectStore();
  const addToast = useUIStore(s => s.addToast);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [showBackup, setShowBackup] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'overwrite' | 'new'>('new');
  const [restoreTarget, setRestoreTarget] = useState<string>('');
  const [restorePreview, setRestorePreview] = useState<any>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const p = await createProject(name.trim(), desc.trim());
    setName(''); setDesc(''); setShowCreate(false);
    await selectProject(p.id);
    navigate('/materials');
  };

  const handleBackupProject = async (projectId: string) => {
    const { getMaterials, getRecipeVersions, getTrials, getReviews, getArchive } = await import('@/lib/database');
    const { getProject } = await import('@/lib/database');
    const project = await getProject(projectId);
    if (!project) { addToast('项目不存在', 'error'); return; }
    const [materials, recipeVersions, trials, reviews] = await Promise.all([
      getMaterials(projectId), getRecipeVersions(projectId),
      getTrials(projectId), getReviews(projectId),
    ]);
    const archive = await getArchive(projectId);
    const data = {
      _meta: {
        exportedAt: new Date().toISOString(),
        app: '古味寻踪',
        version: '2.0',
        type: 'project-backup',
      },
      project,
      materials,
      recipeVersions,
      trials,
      reviews,
      archive: archive || null,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `${project.name}-备份-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`${project.name} 备份已下载`, 'success');
  };

  const handleBackupFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data._meta || data._meta.app !== '古味寻踪' || data._meta.type !== 'project-backup') {
        addToast('无效的备份文件', 'error');
        return;
      }
      setRestorePreview(data);
      setRestoreMode('new');
      setRestoreTarget('');
    } catch {
      addToast('读取备份文件失败', 'error');
    }
    e.target.value = '';
  };

  const handleRestore = async () => {
    if (!restorePreview) return;
    const { saveProject, saveRecipeVersion, saveTrial, saveReview, saveMaterial, saveArchive, getAllProjects } = await import('@/lib/database');
    try {
      if (restoreMode === 'overwrite' && restoreTarget) {
        const data = restorePreview;
        data.project.id = restoreTarget;
        if (data.materials) for (const m of data.materials) { m.projectId = restoreTarget; await saveMaterial(m); }
        if (data.recipeVersions) for (const v of data.recipeVersions) { v.projectId = restoreTarget; await saveRecipeVersion(v); }
        if (data.trials) for (const t of data.trials) { t.projectId = restoreTarget; await saveTrial(t); }
        if (data.reviews) for (const r of data.reviews) { r.projectId = restoreTarget; await saveReview(r); }
        if (data.archive) { data.archive.projectId = restoreTarget; await saveArchive(data.archive); }
        await saveProject(data.project);
        addToast('备份已覆盖恢复到选中项目', 'success');
      } else {
        const newProjectId = generateId();
        const data = restorePreview;
        const project = { ...data.project, id: newProjectId, name: data.project.name + '（恢复）', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        await saveProject(project);
        if (data.materials) for (const m of data.materials) { await saveMaterial({ ...m, id: generateId(), projectId: newProjectId }); }
        if (data.recipeVersions) for (const v of data.recipeVersions) { await saveRecipeVersion({ ...v, id: generateId(), projectId: newProjectId }); }
        if (data.trials) for (const t of data.trials) { await saveTrial({ ...t, id: generateId(), projectId: newProjectId }); }
        if (data.reviews) for (const r of data.reviews) { await saveReview({ ...r, id: generateId(), projectId: newProjectId }); }
        if (data.archive) { await saveArchive({ ...data.archive, id: generateId(), projectId: newProjectId }); }
        addToast('备份已恢复为新项目', 'success');
      }
      await loadProjects();
      setShowBackup(false);
      setRestorePreview(null);
    } catch (err) {
      addToast('恢复失败：' + (err instanceof Error ? err.message : '未知错误'), 'error');
    }
  };

  const stats = [
    { icon: BookOpen, label: '配方总数', value: projects.length, color: 'var(--bronze)' },
    { icon: FlaskConical, label: '试做次数', value: projects.filter(p => p.status === 'in_progress').length, color: 'var(--bamboo)' },
    { icon: Star, label: '评审状态', value: projects.filter(p => p.status === 'review').length, color: 'var(--vermilion)' },
    { icon: Archive, label: '归档进度', value: projects.filter(p => p.status === 'archived').length, color: 'var(--smoke-light)' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-calligraphy text-3xl" style={{ color: 'var(--paper)' }}>古味寻踪</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--smoke-light)' }}>失传菜谱复原工作台</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowBackup(true)} className="ink-btn ink-btn-ghost">
            <HardDrive size={16} /> 现场备份
          </button>
          <button onClick={() => setShowCreate(true)} className="ink-btn ink-btn-primary">
            <Plus size={16} /> 新建项目
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="paper-card p-4 ink-shadow-hover transition-all duration-200">
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={16} style={{ color: s.color }} />
              <span className="text-xs" style={{ color: 'var(--smoke-light)' }}>{s.label}</span>
            </div>
            <div className="font-calligraphy text-2xl" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {projects.length === 0 ? (
        <div className="paper-card p-12 text-center">
          <BookOpen size={40} className="mx-auto mb-3" style={{ color: 'var(--smoke)' }} />
          <p style={{ color: 'var(--smoke-light)' }}>尚无项目，点击"新建项目"开始菜谱复原之旅</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {projects.map((p, i) => (
            <div
              key={p.id}
              className="paper-card p-5 ink-shadow-hover transition-all duration-200 cursor-pointer animate-fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={async () => { await selectProject(p.id); navigate('/materials'); }}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-calligraphy text-lg" style={{ color: 'var(--paper)' }}>{p.name}</h3>
                <span className={`seal-badge ${STATUS_MAP[p.status].cls}`}>{STATUS_MAP[p.status].label}</span>
              </div>
              <p className="text-sm line-clamp-2 mb-3" style={{ color: 'var(--smoke-light)' }}>{p.description || '暂无描述'}</p>
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--smoke)' }}>
                <span>{new Date(p.createdAt).toLocaleDateString('zh-CN')}</span>
                <span style={{ color: 'var(--bronze)' }}>进入 →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowCreate(false)}>
          <div className="paper-card p-6 w-96 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-calligraphy text-xl mb-4" style={{ color: 'var(--paper)' }}>新建项目</h2>
            <div className="mb-3">
              <label className="text-xs mb-1 block" style={{ color: 'var(--smoke-light)' }}>项目名称</label>
              <input className="ink-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：清宫御膳翡翠豆腐" />
            </div>
            <div className="mb-4">
              <label className="text-xs mb-1 block" style={{ color: 'var(--smoke-light)' }}>项目描述</label>
              <textarea className="ink-input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="简述菜谱来源与复原目标" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCreate(false)} className="ink-btn ink-btn-ghost">取消</button>
              <button onClick={handleCreate} className="ink-btn ink-btn-primary">创建</button>
            </div>
          </div>
        </div>
      )}

      {showBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => { setShowBackup(false); setRestorePreview(null); }}>
          <div className="paper-card p-6 w-[560px] max-h-[80vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-calligraphy text-xl mb-4" style={{ color: 'var(--paper)' }}>
              <HardDrive size={20} className="inline mr-2" />现场备份中心
            </h2>

            <section className="mb-6">
              <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--vermilion)' }}>
                <Download size={14} className="inline mr-1" />备份项目
              </h3>
              <p className="text-xs mb-3" style={{ color: 'var(--smoke-light)' }}>
                将项目全部数据（素材、配方版本、试做照片、评审、归档材料）打包下载为 JSON 文件
              </p>
              {projects.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--smoke)' }}>暂无项目可备份</p>
              ) : (
                <div className="space-y-2">
                  {projects.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded" style={{ background: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.08)' }}>
                      <span className="text-sm" style={{ color: 'var(--paper)' }}>{p.name}</span>
                      <button onClick={() => handleBackupProject(p.id)} className="ink-btn ink-btn-ghost text-xs">
                        <Download size={12} /> 备份
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="border-t pt-4" style={{ borderColor: 'rgba(245,240,232,0.1)' }}>
              <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--bamboo)' }}>
                <Upload size={14} className="inline mr-1" />恢复备份
              </h3>
              <p className="text-xs mb-3" style={{ color: 'var(--smoke-light)' }}>
                选择之前导出的备份文件，可覆盖当前项目或恢复为新项目
              </p>
              <button onClick={() => backupInputRef.current?.click()} className="ink-btn ink-btn-secondary text-sm mb-3">
                <Upload size={14} /> 选择备份文件
              </button>
              <input
                ref={backupInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleBackupFileSelect}
              />

              {restorePreview && (
                <div className="space-y-3 animate-fade-in">
                  <div className="p-3 rounded text-sm" style={{ background: 'rgba(245,240,232,0.06)', border: '1px solid rgba(245,240,232,0.1)' }}>
                    <div className="font-bold mb-2" style={{ color: 'var(--paper)' }}>
                      备份内容预览：{restorePreview.project?.name}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs" style={{ color: 'var(--smoke-light)' }}>
                      <span>素材：{restorePreview.materials?.length ?? 0} 份</span>
                      <span>配方版本：{restorePreview.recipeVersions?.length ?? 0} 个</span>
                      <span>试做：{restorePreview.trials?.length ?? 0} 轮</span>
                      <span>评审：{restorePreview.reviews?.length ?? 0} 条</span>
                      <span>归档材料：{restorePreview.archive?.documents?.length ?? 0} 份</span>
                      <span>导出时间：{restorePreview._meta?.exportedAt ? new Date(restorePreview._meta.exportedAt).toLocaleString('zh-CN') : '-'}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs mb-2 block font-semibold" style={{ color: 'var(--paper)' }}>恢复方式</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setRestoreMode('new')}
                        className="ink-btn text-xs flex-1 justify-center"
                        style={{
                          background: restoreMode === 'new' ? 'var(--bamboo)' : 'transparent',
                          color: restoreMode === 'new' ? 'var(--paper)' : 'var(--bamboo)',
                          border: '1px solid var(--bamboo)',
                        }}
                      >
                        恢复为新项目
                      </button>
                      <button
                        onClick={() => setRestoreMode('overwrite')}
                        className="ink-btn text-xs flex-1 justify-center"
                        style={{
                          background: restoreMode === 'overwrite' ? 'var(--vermilion)' : 'transparent',
                          color: restoreMode === 'overwrite' ? 'var(--paper)' : 'var(--vermilion)',
                          border: '1px solid var(--vermilion)',
                        }}
                      >
                        覆盖已有项目
                      </button>
                    </div>
                  </div>

                  {restoreMode === 'overwrite' && (
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--smoke-light)' }}>选择要覆盖的项目</label>
                      <select
                        className="ink-input"
                        value={restoreTarget}
                        onChange={e => setRestoreTarget(e.target.value)}
                      >
                        <option value="">-- 请选择 --</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {restoreTarget && (
                        <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: 'var(--vermilion)' }}>
                          <AlertTriangle size={12} /> 覆盖后原项目数据将被替换，建议先备份
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleRestore}
                    disabled={restoreMode === 'overwrite' && !restoreTarget}
                    className="ink-btn ink-btn-primary w-full disabled:opacity-40"
                  >
                    确认恢复
                  </button>
                </div>
              )}
            </section>

            <div className="flex justify-end mt-4">
              <button onClick={() => { setShowBackup(false); setRestorePreview(null); }} className="ink-btn ink-btn-ghost">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, FlaskConical, Star, Archive, Download, Upload, HardDrive, AlertTriangle, ClipboardCheck, CheckCircle2, Circle, ChevronRight, FileText, Clock, Shield, Eye } from 'lucide-react';
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

interface Deliverable {
  key: string;
  label: string;
  link: string;
  check: (d: any) => boolean;
  detail: (d: any) => string;
}

const DELIVERABLES: Deliverable[] = [
  { key: 'materials', label: '原始素材', link: '/materials',
    check: d => d.materials > 0,
    detail: d => `${d.materials} 份素材` },
  { key: 'recipe', label: '配方版本', link: '/recipe',
    check: d => d.versions > 0 && d.hasSteps,
    detail: d => `${d.versions} 个版本，${d.totalSteps} 个步骤` },
  { key: 'trials', label: '试做记录', link: '/trials',
    check: d => d.trials > 0,
    detail: d => `${d.trials} 轮试做（${d.successTrials} 成功）` },
  { key: 'reviews', label: '评审评分', link: '/review',
    check: d => d.scoredReviews > 0,
    detail: d => d.reviewStatusDetail || `${d.invitedReviewers} 人已邀请，${d.scoredReviews} 人已评分` },
  { key: 'locked', label: '配方锁定', link: '/review',
    check: d => d.hasLockedVersion,
    detail: d => d.hasLockedVersion ? '已有锁定版本' : '尚未锁定任何版本' },
  { key: 'lecture', label: '教学讲义', link: '/archive',
    check: d => d.lectureExported,
    detail: d => d.lectureExported ? '讲义已导出' : '尚未导出讲义' },
  { key: 'authDocs', label: '授权材料', link: '/archive',
    check: d => d.authDocs > 0,
    detail: d => `${d.authDocs} 份授权/证明材料` },
  { key: 'backup', label: '项目备份', link: '/',
    check: d => !!d.lastBackupAt,
    detail: d => d.lastBackupAt ? `最近备份：${new Date(d.lastBackupAt).toLocaleString('zh-CN')}` : '尚未备份' },
];

const AUDIT_ACTION_LABELS: Record<string, string> = {
  lock_version: '锁定配方',
  export_lecture: '导出讲义',
  issue_scorecard: '发放评分卡',
  package_delivery: '打包交付',
  restore_backup: '恢复备份',
  sign_confirmation: '签收确认',
  backup_project: '备份项目',
};

export default function Home() {
  const navigate = useNavigate();
  const { projects, currentProject, loadProjects, createProject, selectProject, addAuditLog, updateProjectField } = useProjectStore();
  const addToast = useUIStore(s => s.addToast);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [showBackup, setShowBackup] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'overwrite' | 'new'>('new');
  const [restoreTarget, setRestoreTarget] = useState<string>('');
  const [restorePreview, setRestorePreview] = useState<any>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistProjectId, setChecklistProjectId] = useState('');
  const [checklistData, setChecklistData] = useState<Record<string, any>>({});
  const [checklistProject, setChecklistProject] = useState<Project | null>(null);
  const [showAuditLog, setShowAuditLog] = useState(false);
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
    const { getMaterials, getRecipeVersions, getTrials, getReviews, getArchive, getProject } = await import('@/lib/database');
    const project = await getProject(projectId);
    if (!project) { addToast('项目不存在', 'error'); return; }
    const [materials, recipeVersions, trials, reviews] = await Promise.all([
      getMaterials(projectId), getRecipeVersions(projectId),
      getTrials(projectId), getReviews(projectId),
    ]);
    const archive = await getArchive(projectId);
    const data = {
      _meta: { exportedAt: new Date().toISOString(), app: '古味寻踪', version: '4.0', type: 'project-backup' },
      project, materials, recipeVersions, trials, reviews, archive: archive || null,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `${project.name}-备份-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    await updateProjectField(projectId, { lastBackupAt: new Date().toISOString() });
    await addAuditLog(projectId, 'backup_project', `${project.name} 备份已下载`);
    addToast(`${project.name} 备份已下载`, 'success');
  };

  const handleBackupFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data._meta || data._meta.app !== '古味寻踪') {
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
    const { saveProject, saveRecipeVersion, saveTrial, saveReview, saveMaterial, saveArchive, deleteProjectData } = await import('@/lib/database');
    try {
      if (restoreMode === 'overwrite' && restoreTarget) {
        await deleteProjectData(restoreTarget);
        const data = restorePreview;
        const versionIdMap: Record<string, string> = {};
        const project = { ...data.project, id: restoreTarget, lastBackupAt: new Date().toISOString() };
        await saveProject(project);
        if (data.recipeVersions) {
          for (const v of data.recipeVersions) {
            const newVid = generateId();
            versionIdMap[v.id] = newVid;
            await saveRecipeVersion({ ...v, id: newVid, projectId: restoreTarget });
          }
        }
        if (data.materials) for (const m of data.materials) await saveMaterial({ ...m, id: generateId(), projectId: restoreTarget });
        if (data.trials) for (const t of data.trials) await saveTrial({ ...t, id: generateId(), projectId: restoreTarget, recipeVersionId: versionIdMap[t.recipeVersionId] || t.recipeVersionId });
        if (data.reviews) for (const r of data.reviews) await saveReview({ ...r, id: generateId(), projectId: restoreTarget, recipeVersionId: versionIdMap[r.recipeVersionId] || r.recipeVersionId });
        if (data.archive) await saveArchive({ ...data.archive, id: generateId(), projectId: restoreTarget });
        await addAuditLog(restoreTarget, 'restore_backup', `覆盖恢复：${data.project?.name}`);
        addToast('备份已覆盖恢复到选中项目（旧数据已清理，版本已重映射）', 'success');
      } else {
        const newProjectId = generateId();
        const versionIdMap: Record<string, string> = {};
        const data = restorePreview;
        const project = { ...data.project, id: newProjectId, name: data.project.name + '（恢复）', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastBackupAt: new Date().toISOString() };
        await saveProject(project);
        if (data.recipeVersions) {
          for (const v of data.recipeVersions) {
            const newVid = generateId();
            versionIdMap[v.id] = newVid;
            await saveRecipeVersion({ ...v, id: newVid, projectId: newProjectId });
          }
        }
        if (data.materials) for (const m of data.materials) await saveMaterial({ ...m, id: generateId(), projectId: newProjectId });
        if (data.trials) for (const t of data.trials) await saveTrial({ ...t, id: generateId(), projectId: newProjectId, recipeVersionId: versionIdMap[t.recipeVersionId] || t.recipeVersionId });
        if (data.reviews) for (const r of data.reviews) await saveReview({ ...r, id: generateId(), projectId: newProjectId, recipeVersionId: versionIdMap[r.recipeVersionId] || r.recipeVersionId });
        if (data.archive) await saveArchive({ ...data.archive, id: generateId(), projectId: newProjectId });
        await addAuditLog(newProjectId, 'restore_backup', `恢复为新项目：${project.name}`);
        addToast('备份已恢复为新项目（试做/评审已关联到新版本）', 'success');
      }
      await loadProjects();
      setShowBackup(false);
      setRestorePreview(null);
    } catch (err) {
      addToast('恢复失败：' + (err instanceof Error ? err.message : '未知错误'), 'error');
    }
  };

  const openChecklist = async (projectId: string) => {
    const { getMaterials, getRecipeVersions, getTrials, getReviews, getArchive, getProject } = await import('@/lib/database');
    const [materials, versions, trials, reviews] = await Promise.all([
      getMaterials(projectId), getRecipeVersions(projectId),
      getTrials(projectId), getReviews(projectId),
    ]);
    const archive = await getArchive(projectId);
    const project = await getProject(projectId);
    const authDocs = (archive?.documents ?? []).filter((d: any) => d.type === 'authorization' || d.type === 'proof').length;
    const totalSteps = versions.reduce((s: number, v: any) => s + v.steps.length, 0);
    const invitedCount = reviews.filter((r: any) => !r.scoreCardIssued && !r.scored).length;
    const issuedCount = reviews.filter((r: any) => r.scoreCardIssued && !r.scored).length;
    const scoredCount = reviews.filter((r: any) => r.scored).length;
    setChecklistData({
      materials: materials.length,
      versions: versions.length,
      hasSteps: versions.some((v: any) => v.steps.length > 0),
      totalSteps,
      trials: trials.length,
      successTrials: trials.filter((t: any) => t.result === 'success').length,
      invitedReviewers: reviews.length,
      scoredReviews: reviews.filter((r: any) => r.scored).length,
      hasLockedVersion: versions.some((v: any) => v.locked),
      lectureExported: archive?.lectureExported ?? false,
      authDocs,
      lastBackupAt: project?.lastBackupAt,
      lastPackageExportAt: project?.lastPackageExportAt,
      confirmationSignedAt: project?.confirmationSignedAt,
      reviewStatusDetail: `已邀请 ${invitedCount} / 已发放 ${issuedCount} / 已评分 ${scoredCount}`,
      reviewInvited: invitedCount,
      reviewIssued: issuedCount,
      reviewScored: scoredCount,
    });
    setChecklistProjectId(projectId);
    setChecklistProject(project || null);
    setShowChecklist(true);
    setShowAuditLog(false);
  };

  const handleExportConfirmation = async () => {
    const project = projects.find(p => p.id === checklistProjectId);
    if (!project) return;
    const d = checklistData;
    const date = new Date().toLocaleDateString('zh-CN');
    const rows = DELIVERABLES.map(item => {
      const ok = item.check(d);
      return `<tr><td>${item.label}</td><td>${item.detail(d)}</td><td style="color:${ok ? '#2d6a4f' : '#c0392b'};font-weight:700;">${ok ? '✔ 齐全' : '✘ 缺失'}</td></tr>`;
    }).join('\n');
    const allDone = DELIVERABLES.filter(i => i.key !== 'backup').every(i => i.check(d));

    let reviewSection = '';
    if (d.reviewInvited !== undefined) {
      reviewSection = `<h2>评审状态</h2><table><tr><th>状态</th><th>人数</th></tr>
<tr><td>已邀请（未发卡）</td><td>${d.reviewInvited}</td></tr>
<tr><td>已发放（待回收）</td><td>${d.reviewIssued}</td></tr>
<tr><td>已评分</td><td>${d.reviewScored}</td></tr></table>`;
    }

    let auditSection = '';
    const auditLog = project.auditLog || [];
    if (auditLog.length > 0) {
      auditSection = `<h2>关键操作记录</h2><table><tr><th>操作</th><th>详情</th><th>时间</th></tr>
${auditLog.map(e => `<tr><td>${AUDIT_ACTION_LABELS[e.action] || e.action}</td><td>${e.detail}</td><td>${new Date(e.timestamp).toLocaleString('zh-CN')}</td></tr>`).join('\n')}</table>`;
    }

    const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${project.name} 交付确认单</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap');
body{font-family:'Noto Serif SC',serif;max-width:700px;margin:0 auto;padding:40px;color:#1a1a2e;background:#f5f0e8;line-height:1.8;}
h1{text-align:center;border-bottom:3px double #b8860b;padding-bottom:12px;font-size:24px;}
h2{font-size:16px;color:#c0392b;border-left:4px solid #c0392b;padding-left:12px;margin-top:24px;}
table{width:100%;border-collapse:collapse;margin:16px 0;}
th,td{border:1px solid #d0c8b8;padding:8px 12px;text-align:left;font-size:14px;}
th{background:#e8e0d0;font-weight:600;}
.sign{margin-top:40px;border-top:2px solid #b8860b;padding-top:16px;}
.sign-row{display:flex;justify-content:space-between;margin:12px 0;}
.sign-line{border-bottom:1px solid #1a1a2e;width:200px;display:inline-block;margin-left:8px;}
</style></head><body>
<h1>${project.name}<br/>交付确认单</h1>
<p style="text-align:center;color:#6a6a7a;">生成日期：${date}</p>
<table><tr><th>交付项</th><th>内容</th><th>状态</th></tr>${rows}</table>
<p style="text-align:center;font-size:18px;font-weight:700;color:${allDone ? '#2d6a4f' : '#c0392b'};">
${allDone ? '✔ 所有交付项齐全，可签收' : '⚠ 部分交付项缺失，请补齐后签收'}
</p>
${reviewSection}
${auditSection}
<div class="sign">
<div class="sign-row"><span>项目负责人签字：</span><span class="sign-line"></span></div>
<div class="sign-row"><span>接收方签字：</span><span class="sign-line"></span></div>
<div class="sign-row"><span>日期：</span><span class="sign-line"></span></div>
</div>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}-交付确认单-${date.replace(/\//g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    await updateProjectField(project.id, { confirmationSignedAt: new Date().toISOString() });
    await addAuditLog(project.id, 'sign_confirmation', '导出交付确认单');
    addToast('交付确认单已导出', 'success');
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
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-calligraphy text-lg" style={{ color: 'var(--paper)' }} onClick={async () => { await selectProject(p.id); navigate('/materials'); }}>{p.name}</h3>
                <span className={`seal-badge ${STATUS_MAP[p.status].cls}`}>{STATUS_MAP[p.status].label}</span>
              </div>
              <p className="text-sm line-clamp-2 mb-3" style={{ color: 'var(--smoke-light)' }}>{p.description || '暂无描述'}</p>
              <div className="space-y-1 mb-3 text-xs" style={{ color: 'var(--smoke)' }}>
                {p.lastBackupAt && (
                  <div className="flex items-center gap-1">
                    <HardDrive size={10} /> 最近备份：{new Date(p.lastBackupAt).toLocaleString('zh-CN')}
                  </div>
                )}
                {p.lastPackageExportAt && (
                  <div className="flex items-center gap-1">
                    <Archive size={10} /> 最近交付包：{new Date(p.lastPackageExportAt).toLocaleString('zh-CN')}
                  </div>
                )}
                {p.confirmationSignedAt && (
                  <div className="flex items-center gap-1" style={{ color: 'var(--bamboo)' }}>
                    <Shield size={10} /> 已签收：{new Date(p.confirmationSignedAt).toLocaleString('zh-CN')}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--smoke)' }}>
                <span>{new Date(p.createdAt).toLocaleDateString('zh-CN')}</span>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); openChecklist(p.id); }} className="hover:text-bronze transition" style={{ color: 'var(--smoke-light)' }}>
                    <ClipboardCheck size={14} className="inline" /> 交付清单
                  </button>
                  <span style={{ color: 'var(--bronze)' }} onClick={async () => { await selectProject(p.id); navigate('/materials'); }}>进入 →</span>
                </div>
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
                将项目全部数据打包下载，恢复时试做记录和评审会自动关联到新版本
              </p>
              {projects.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--smoke)' }}>暂无项目可备份</p>
              ) : (
                <div className="space-y-2">
                  {projects.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded" style={{ background: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.08)' }}>
                      <div>
                        <span className="text-sm" style={{ color: 'var(--paper)' }}>{p.name}</span>
                        {p.lastBackupAt && (
                          <span className="text-xs ml-2" style={{ color: 'var(--smoke)' }}>
                            最近备份：{new Date(p.lastBackupAt).toLocaleString('zh-CN')}
                          </span>
                        )}
                      </div>
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
                恢复为新项目时，试做和评审会重新关联到新版本；覆盖时旧数据将先清除再写入，所有记录获得独立新ID
              </p>
              <button onClick={() => backupInputRef.current?.click()} className="ink-btn ink-btn-secondary text-sm mb-3">
                <Upload size={14} /> 选择备份文件
              </button>
              <input ref={backupInputRef} type="file" accept=".json" className="hidden" onChange={handleBackupFileSelect} />
              {restorePreview && (
                <div className="space-y-3 animate-fade-in">
                  <div className="p-3 rounded text-sm" style={{ background: 'rgba(245,240,232,0.06)', border: '1px solid rgba(245,240,232,0.1)' }}>
                    <div className="font-bold mb-2" style={{ color: 'var(--paper)' }}>备份内容预览：{restorePreview.project?.name}</div>
                    <div className="grid grid-cols-3 gap-2 text-xs" style={{ color: 'var(--smoke-light)' }}>
                      <span>素材：{restorePreview.materials?.length ?? 0} 份</span>
                      <span>配方版本：{restorePreview.recipeVersions?.length ?? 0} 个</span>
                      <span>试做：{restorePreview.trials?.length ?? 0} 轮</span>
                      <span>评审：{restorePreview.reviews?.length ?? 0} 条</span>
                      <span>归档材料：{restorePreview.archive?.documents?.length ?? 0} 份</span>
                      <span>导出时间：{restorePreview._meta?.exportedAt ? new Date(restorePreview._meta.exportedAt).toLocaleString('zh-CN') : '-'}</span>
                    </div>
                    {restorePreview.recipeVersions?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs font-semibold" style={{ color: 'var(--paper)' }}>版本详情：</div>
                        {restorePreview.recipeVersions.map((v: any) => (
                          <div key={v.id} className="text-xs" style={{ color: 'var(--smoke-light)' }}>
                            第{v.versionNumber}版 {v.locked ? '🔒 锁定' : '✏️ 草稿'} — {v.steps?.length || 0}步 / {v.ingredients?.length || 0}种食材
                          </div>
                        ))}
                      </div>
                    )}
                    {restorePreview._meta?.type === 'delivery-package' && restorePreview.readme && (
                      <div className="mt-2 p-2 rounded text-xs" style={{ background: 'rgba(184,134,11,0.08)', border: '1px solid rgba(184,134,11,0.2)' }}>
                        <div className="font-semibold" style={{ color: 'var(--bronze)' }}>交付包信息</div>
                        <div style={{ color: 'var(--smoke-light)' }}>打包范围：{restorePreview.readme.scope?.versions || '全部'}</div>
                        <div style={{ color: 'var(--smoke-light)' }}>含原始素材：{restorePreview.readme.scope?.includeMaterials ? '是' : '否'}</div>
                        <div style={{ color: 'var(--smoke-light)' }}>含评分卡：{restorePreview.readme.scope?.includeScoreCard ? '是' : '否'}</div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs mb-2 block font-semibold" style={{ color: 'var(--paper)' }}>恢复方式</label>
                    <div className="flex gap-3">
                      <button onClick={() => setRestoreMode('new')} className="ink-btn text-xs flex-1 justify-center"
                        style={{ background: restoreMode === 'new' ? 'var(--bamboo)' : 'transparent', color: restoreMode === 'new' ? 'var(--paper)' : 'var(--bamboo)', border: '1px solid var(--bamboo)' }}>
                        恢复为新项目
                      </button>
                      <button onClick={() => setRestoreMode('overwrite')} className="ink-btn text-xs flex-1 justify-center"
                        style={{ background: restoreMode === 'overwrite' ? 'var(--vermilion)' : 'transparent', color: restoreMode === 'overwrite' ? 'var(--paper)' : 'var(--vermilion)', border: '1px solid var(--vermilion)' }}>
                        覆盖已有项目
                      </button>
                    </div>
                  </div>
                  {restoreMode === 'overwrite' && (
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--smoke-light)' }}>选择要覆盖的项目</label>
                      <select className="ink-input" value={restoreTarget} onChange={e => setRestoreTarget(e.target.value)}>
                        <option value="">-- 请选择 --</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      {restoreTarget && (
                        <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: 'var(--vermilion)' }}>
                          <AlertTriangle size={12} /> 覆盖后原项目所有旧数据将被清除再写入，建议先备份
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={handleRestore} disabled={restoreMode === 'overwrite' && !restoreTarget} className="ink-btn ink-btn-primary w-full disabled:opacity-40">
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

      {showChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowChecklist(false)}>
          <div className="paper-card p-6 w-[640px] max-h-[85vh] overflow-y-auto animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-calligraphy text-xl" style={{ color: 'var(--paper)' }}>
                <ClipboardCheck size={20} className="inline mr-2" />交付签收台账
              </h2>
              <div className="flex gap-2">
                <button onClick={() => setShowAuditLog(v => !v)} className="ink-btn ink-btn-ghost text-xs">
                  <Clock size={12} /> {showAuditLog ? '收起日志' : '审计日志'}
                </button>
                <button onClick={() => setShowChecklist(false)} className="ink-btn ink-btn-ghost text-xs">✕</button>
              </div>
            </div>

            {checklistProject && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded text-center" style={{ background: 'rgba(184,134,11,0.08)', border: '1px solid rgba(184,134,11,0.15)' }}>
                  <div className="text-xs" style={{ color: 'var(--smoke-light)' }}>最近备份</div>
                  <div className="text-sm font-semibold mt-1" style={{ color: checklistData.lastBackupAt ? 'var(--bamboo)' : 'var(--vermilion)' }}>
                    {checklistData.lastBackupAt ? new Date(checklistData.lastBackupAt).toLocaleString('zh-CN') : '未备份'}
                  </div>
                </div>
                <div className="p-3 rounded text-center" style={{ background: 'rgba(45,106,79,0.08)', border: '1px solid rgba(45,106,79,0.15)' }}>
                  <div className="text-xs" style={{ color: 'var(--smoke-light)' }}>最近交付包</div>
                  <div className="text-sm font-semibold mt-1" style={{ color: checklistData.lastPackageExportAt ? 'var(--bamboo)' : 'var(--vermilion)' }}>
                    {checklistData.lastPackageExportAt ? new Date(checklistData.lastPackageExportAt).toLocaleString('zh-CN') : '未导出'}
                  </div>
                </div>
                <div className="p-3 rounded text-center" style={{ background: checklistData.confirmationSignedAt ? 'rgba(45,106,79,0.08)' : 'rgba(192,57,43,0.06)', border: checklistData.confirmationSignedAt ? '1px solid rgba(45,106,79,0.15)' : '1px solid rgba(192,57,43,0.15)' }}>
                  <div className="text-xs" style={{ color: 'var(--smoke-light)' }}>签收状态</div>
                  <div className="text-sm font-semibold mt-1" style={{ color: checklistData.confirmationSignedAt ? 'var(--bamboo)' : 'var(--vermilion)' }}>
                    {checklistData.confirmationSignedAt ? '✔ 已签收' : '未签收'}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 mb-4">
              {DELIVERABLES.map(item => {
                const ok = item.check(checklistData);
                const isReview = item.key === 'reviews';
                return (
                  <div key={item.key} className="flex items-center gap-3 px-4 py-3 rounded cursor-pointer transition-all hover:bg-paper/5"
                    style={{ border: `1px solid ${ok ? 'rgba(45,106,79,0.2)' : 'rgba(192,57,43,0.2)'}` }}
                    onClick={async () => {
                      if (item.key !== 'backup') {
                        await selectProject(checklistProjectId);
                        navigate(item.link);
                        setShowChecklist(false);
                      } else {
                        setShowChecklist(false);
                        setShowBackup(true);
                      }
                    }}
                  >
                    {ok ? <CheckCircle2 size={18} style={{ color: 'var(--bamboo)' }} /> : <Circle size={18} style={{ color: 'var(--vermilion)' }} />}
                    <div className="flex-1">
                      <div className="text-sm font-semibold" style={{ color: 'var(--paper)' }}>{item.label}</div>
                      <div className="text-xs" style={{ color: 'var(--smoke-light)' }}>{item.detail(checklistData)}</div>
                      {isReview && checklistData.reviewInvited !== undefined && (
                        <div className="flex gap-3 mt-1">
                          <span className="text-xs" style={{ color: 'var(--smoke-light)' }}>已邀请 {checklistData.reviewInvited}</span>
                          <span className="text-xs" style={{ color: 'var(--bronze)' }}>已发放 {checklistData.reviewIssued}</span>
                          <span className="text-xs" style={{ color: 'var(--bamboo-light)' }}>已评分 {checklistData.reviewScored}</span>
                        </div>
                      )}
                    </div>
                    {!ok && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--vermilion)' }}>
                        去补齐 <ChevronRight size={12} />
                      </span>
                    )}
                    {ok && <span className="text-xs" style={{ color: 'var(--bamboo)' }}>✔</span>}
                  </div>
                );
              })}
            </div>

            {showAuditLog && checklistProject && (
              <div className="mb-4 p-3 rounded animate-fade-in" style={{ background: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.1)' }}>
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--paper)' }}>
                  <Clock size={14} className="inline mr-1" />审计日志
                </h3>
                {(checklistProject.auditLog || []).length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--smoke)' }}>暂无操作记录</p>
                ) : (
                  <div className="space-y-2">
                    {[...(checklistProject.auditLog || [])].reverse().map(entry => (
                      <div key={entry.id} className="flex items-start gap-2 text-xs px-2 py-1.5 rounded" style={{ background: 'rgba(245,240,232,0.03)' }}>
                        <span className="shrink-0 font-semibold" style={{ color: 'var(--bronze)' }}>
                          {AUDIT_ACTION_LABELS[entry.action] || entry.action}
                        </span>
                        <span className="flex-1" style={{ color: 'var(--smoke-light)' }}>{entry.detail}</span>
                        <span className="shrink-0" style={{ color: 'var(--smoke)' }}>{new Date(entry.timestamp).toLocaleString('zh-CN')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end border-t pt-4" style={{ borderColor: 'rgba(245,240,232,0.1)' }}>
              <button onClick={handleExportConfirmation} className="ink-btn ink-btn-secondary">
                <FileText size={14} /> 导出交付确认单
              </button>
              <button onClick={() => setShowChecklist(false)} className="ink-btn ink-btn-ghost">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

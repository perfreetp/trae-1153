import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, FlaskConical, Star, Archive } from 'lucide-react';
import { useProjectStore } from '@/stores';
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
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const p = await createProject(name.trim(), desc.trim());
    setName(''); setDesc(''); setShowCreate(false);
    await selectProject(p.id);
    navigate('/materials');
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
        <button onClick={() => setShowCreate(true)} className="ink-btn ink-btn-primary">
          <Plus size={16} /> 新建项目
        </button>
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
    </div>
  );
}

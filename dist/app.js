const app = document.querySelector('#app');
const STORE_KEY = 'forge-studio-state-v1';
let studioState = loadState();
let currentView = 'dashboard';
let apiUrl = localStorage.getItem('forge-api-url') || '';
let activeEventSource = null;

const seededProject = {
  id: 'pass-or-fail',
  name: 'PassOrFail.ai',
  type: 'Education',
  idea: 'Predict student success with early signals and actionable insights.',
  stage: 'ux_running',
  readiness: 70,
  artifactVersion: 1,
};

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || { projects: [], activeProjectId: null }; }
  catch { return { projects: [], activeProjectId: null }; }
}

function saveState() { localStorage.setItem(STORE_KEY, JSON.stringify(studioState)); }
function activeProject() { return studioState.projects.find(project => project.id === studioState.activeProjectId) || seededProject; }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]); }
function initials(name = '') { return name.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase() || 'NP'; }
function stageLabel(stage) {
  return ({ strategist_running: 'Ideation', awaiting_approval: 'Review', strategist_approved: 'Planning', ux_running: 'Planning', failed: 'Needs attention' })[stage] || 'Planning';
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${response.status})`);
  }
  return response.json();
}

function icon(name, tone = 'blue') { return `<span class="soft-icon ${tone}">${name}</span>`; }

function dashboardTemplate() {
  const createdCards = studioState.projects.map(project => `
    <article class="project-card" data-project-id="${project.id}">
      <div class="project-visual generated"><span>${initials(project.name)}</span><b>${stageLabel(project.stage)}</b></div>
      <div class="project-card-body"><div class="project-title-row"><h3>${escapeHtml(project.name)}</h3><button>•••</button></div>
      <p>${escapeHtml(project.idea)}</p><div class="progress-line"><i style="width:${project.readiness || 10}%"></i></div>
      <div class="project-progress"><strong>${project.readiness || 10}%</strong><span>${escapeHtml(project.type || 'AI Product')}</span><time>Updated now</time></div></div>
    </article>`).join('');

  return `
    <section class="page-heading"><div><h1>Dashboard</h1><p>Track projects, agent workflows, and approvals.</p></div><div class="greeting"><span>Mon, Sep 14, 2026</span><b>☀</b><span>Good morning, Andrew!</span></div></section>
    <section class="welcome-banner">
      <div class="welcome-copy"><span class="eyebrow">WELCOME BACK 👋</span><h2>Turn your next big idea into reality.</h2><p>Let your AI product team research, plan, design, and build an implementation-ready plan in minutes.</p><div class="welcome-actions"><button class="primary-button new-project">🚀 Start from an idea</button><button class="secondary-button" data-view="templates">▧ Browse templates</button></div></div>
      <div class="idea-flow" aria-label="Idea to shipped product workflow"><div>${icon('💡','amber')}<span>Idea</span></div><b>→</b><div>${icon('▤','blue')}<span>Plan</span></div><b>→</b><div>${icon('&lt;/&gt;','mint')}<span>Build</span></div><b>→</b><div>${icon('🚀','coral')}<span>Ship</span></div></div>
    </section>
    <section class="metric-grid">
      <article>${icon('▣','blue')}<div><strong>${3 + studioState.projects.length}</strong><span>Active Projects</span><small class="up">↑ ${studioState.projects.length || 2} this week</small></div><b>›</b></article>
      <article>${icon('ϟ','amber')}<div><strong>48</strong><span>Agent Runs</span><small class="up">↑ 12 today</small></div><b>›</b></article>
      <article>${icon('◷','coral')}<div><strong>5</strong><span>Pending Approvals</span><small class="down">↓ 3 this week</small></div><b>›</b></article>
      <article>${icon('🚀','mint')}<div><strong>3</strong><span>Ready to Ship</span><small class="up">↑ 1 this week</small></div><b>›</b></article>
    </section>
    <section class="dashboard-layout">
      <div class="dashboard-main">
        <section class="surface recent-projects"><header class="section-header"><h2>Recent Projects</h2><button data-view="workspace">View all projects →</button></header><div class="project-card-grid">
          <article class="project-card" data-open="workspace"><div class="project-visual education"><span>🎓</span><b>In Progress</b></div><div class="project-card-body"><div class="project-title-row"><h3>PassOrFail.ai</h3><button>•••</button></div><p>AI study copilot that helps students learn smarter and track progress.</p><div class="progress-line"><i style="width:70%"></i></div><div class="project-progress"><strong>70%</strong><span>Next.js · OpenAI</span><time>2h ago</time></div></div></article>
          <article class="project-card"><div class="project-visual analytics"><span>📈</span><b>Planning</b></div><div class="project-card-body"><div class="project-title-row"><h3>AdMuse</h3><button>•••</button></div><p>AI-powered ad analysis and audience research platform.</p><div class="progress-line"><i style="width:35%"></i></div><div class="project-progress"><strong>35%</strong><span>TypeScript · Redis</span><time>5h ago</time></div></div></article>
          <article class="project-card"><div class="project-visual media"><span>▶</span><b>Ideation</b></div><div class="project-card-body"><div class="project-title-row"><h3>Flipcast</h3><button>•••</button></div><p>Turn any topic into a produced, playable podcast episode.</p><div class="progress-line"><i style="width:20%"></i></div><div class="project-progress"><strong>20%</strong><span>Next.js · OpenAI</span><time>1d ago</time></div></div></article>
          ${createdCards}
        </div></section>
        <div class="dashboard-bottom">
          <section class="surface compact-panel"><header class="section-header"><h2>Live Agent Activity</h2><button data-view="agents">View all →</button></header>${activityRows(true)}</section>
          <section class="surface compact-panel"><header class="section-header"><h2>Pending Approvals</h2><button data-view="artifacts">View all →</button></header>${approvalRows()}</section>
        </div>
      </div>
      <aside class="dashboard-aside">
        <section class="surface workflow-snapshot"><header class="section-header"><h2>Workflow Snapshot</h2><button data-view="workspace">View workflow →</button></header><div class="mini-flow"><div>${icon('💡','amber')}<span>Idea</span></div><b>→</b><div>${icon('▤','blue')}<span>Plan</span></div><b>→</b><div>${icon('&lt;/&gt;','mint')}<span>Build</span></div><b>→</b><div>${icon('🚀','coral')}<span>Ship</span></div></div><div class="current-project"><small>Current Project</small><div><strong>PassOrFail.ai</strong><span>Stage <b>● Planning</b></span></div><div class="snapshot-progress"><i></i><span>2 / 4 steps</span></div></div></section>
        <section class="surface throughput"><header class="section-header"><h2>Project Throughput</h2><button>Last 30 days⌄</button></header><div class="chart-bars">${[2,3,4,2,6,3,4,7,5,8,7,5,4,8,10,9,12,8,6,11,9,14,10,8,12,14,16,18].map((v,i)=>`<i style="height:${v*3.2}px" title="${v} tasks"></i>`).join('')}</div><div class="chart-labels"><span>Aug 17</span><span>Aug 31</span><span>Sep 7</span><span>Sep 14</span></div></section>
        <section class="surface templates-mini"><header class="section-header"><h2>Quick Start Templates</h2><button data-view="templates">Browse all →</button></header><div><button>🚀<span>SaaS App</span></button><button>⬢<span>AI Product</span></button><button>▰<span>Internal Tool</span></button><button>▯<span>Mobile App</span></button></div></section>
      </aside>
    </section>`;
}

function activityRows(compact = false) {
  const rows = [
    ['✦','purple','Product Agent','Analyzing market opportunities for PassOrFail.ai...','2m'],
    ['⌕','blue','Research Agent','Searching competitor insights via web tools','5m'],
    ['✣','mint','Design Agent','Generating interface concepts and user flows','12m'],
    ['&lt;/&gt;','coral','Dev Agent','Scaffolding the implementation plan','18m'],
  ];
  return `<div class="activity-list ${compact ? 'compact' : ''}">${rows.map(row=>`<article>${icon(row[0],row[1])}<i></i><div><strong>${row[2]}</strong><p>${row[3]}</p></div><time>${row[4]} ago</time></article>`).join('')}</div>`;
}

function approvalRows() {
  return `<div class="approval-list">${[['▤','purple','Product Brief','PassOrFail.ai','2h'],['✣','blue','UX Flow','AdMuse','5h'],['◇','mint','Architecture Diagram','Flipcast','1d'],['☷','coral','Go-to-Market Plan','PassOrFail.ai','1d']].map(row=>`<article>${icon(row[0],row[1])}<div><strong>${row[2]}</strong><span>${row[3]}</span></div><time>${row[4]} ago</time><button data-open="workspace">Review</button></article>`).join('')}</div>`;
}

function workflowSteps(project) {
  const waiting = project.stage === 'strategist_running';
  const approved = project.stage === 'strategist_approved';
  return `
    <div class="workflow-intro"><h2>Agent Workflow</h2><p>A team of AI agents turning your idea into a real product.</p></div>
    <div class="workflow-list">
      <article class="workflow-step complete"><span>✓</span><div><header><strong>1. Product Strategist</strong><time>12m ago</time></header><p>Define the opportunity, value proposition, and go-to-market strategy.</p><button>▤ Product strategy completed <i>✓</i></button></div></article>
      <article class="workflow-step complete"><span>✓</span><div><header><strong>2. Research Agent</strong><time>28m ago</time></header><p>Validate the problem with market, competitor, and user research.</p><button>▤ Research insights ready <i>✓</i></button></div></article>
      <article class="workflow-step active"><span>✦</span><div><header><strong>3. UX Designer</strong><time>${waiting ? 'Queued' : 'In progress'}</time></header><p>Create user personas, journeys, and key user flows.</p><button class="working">✦ Generating user flows... <i></i></button></div></article>
      <article class="workflow-step pending"><span>4</span><div><header><strong>4. Solution Architect</strong><time>Pending</time></header><p>Design the technical architecture and identify core components.</p></div></article>
      <article class="workflow-step pending"><span>5</span><div><header><strong>5. Engineering Planner</strong><time>${approved ? 'Ready' : 'Pending'}</time></header><p>Break down the work, define milestones, and plan the build.</p></div></article>
    </div>`;
}

function projectTemplate(project = seededProject) {
  const brief = project.brief || {};
  const waiting = project.stage === 'strategist_running';
  const needsApproval = project.stage === 'awaiting_approval';
  const title = escapeHtml(project.name);
  const description = escapeHtml(project.idea || seededProject.idea);
  const problem = escapeHtml(brief.problem || 'Many students struggle early in their academic journey, while institutions lack real-time, actionable insights to identify who is at risk and provide timely support.');
  const users = brief.target_users || ['University and college administrators', 'Academic advisors and success coaches', 'Students'];
  const features = brief.mvp_features || ['Ingest academic and engagement data', 'Predict risk with explainable signals', 'Provide recommended next steps', 'Export reports for institutional review'];
  return `
    <section class="project-hero surface">
      <div class="breadcrumbs"><button data-view="dashboard">Projects</button><span>›</span><strong>${title}</strong></div>
      <div class="project-hero-main"><div class="project-logo">🎓</div><div class="project-identity"><div><h1>${title}</h1><span class="running-pill">● Running</span></div><p>${description}</p><div class="tag-row"><span>Education</span><span>B2B SaaS</span><span>Early Stage</span><button>＋ Add tag</button></div></div><div class="project-hero-actions"><button class="secondary-button">♧ Share</button><button class="secondary-button setup-button">⚙ Settings</button><button class="secondary-button">•••</button></div></div>
      <nav class="project-tabs"><button>◉ Overview</button><button class="active">✣ Agent Workflow</button><button data-view="artifacts">▧ Artifacts</button><button data-view="backlog">☷ Backlog</button><button>▱ Files</button><button>↗ Activity</button><button class="setup-button">⚙ Settings</button></nav>
    </section>
    <section class="project-layout">
      <aside class="surface workflow-panel">${workflowSteps(project)}</aside>
      <section class="surface artifact-review">
        <header class="artifact-header"><div><h2>Artifact Review</h2><span>Draft v${project.artifactVersion || 1}</span></div><small><i></i> Auto-saved 2 min ago</small></header>
        <article class="artifact-document">
          ${waiting ? `<div class="generation-box"><span class="spinner"></span><div><strong>Product Strategist is shaping the brief</strong><p>Clarifying the problem, users, MVP boundary, and success measures.</p></div></div>` : ''}
          <div class="artifact-title"><span>▤</span><div><h2>Product Requirements</h2><p>MVP brief and requirements</p></div><button>✎ Edit</button></div>
          <section class="artifact-section"><span class="section-symbol purple">◎</span><div><h3>Problem</h3><p>${problem}</p></div></section>
          <section class="artifact-section"><span class="section-symbol blue">♟</span><div><h3>Target Users</h3><ul>${users.slice(0,4).map(user=>`<li>${escapeHtml(user)}</li>`).join('')}</ul></div></section>
          <section class="artifact-section"><span class="section-symbol mint">♢</span><div><h3>MVP Features</h3><ul>${features.slice(0,5).map(feature=>`<li>${escapeHtml(feature)}</li>`).join('')}</ul></div></section>
          <section class="artifact-section"><span class="section-symbol amber">▥</span><div><h3>Success Metrics</h3><ul><li>Predictive model accuracy above 80%</li><li>Adoption at three or more pilot institutions</li><li>Positive feedback from advisors and students</li><li>Reduction in at-risk student dropout rate</li></ul></div></section>
        </article>
        <footer class="review-actions">${needsApproval ? `<button class="reject-button">× Reject</button><button class="revise-button">↻ Revise</button><button class="approve-button">✓ Approve &amp; Continue</button>` : waiting ? `<span>Approval controls unlock when the brief is ready.</span><button class="approve-button" disabled>Generating...</button>` : `<button class="reject-button">× Reject</button><button class="revise-button">↻ Revise</button><button class="approve-button">✓ Approved</button>`}</footer>
      </section>
      <aside class="project-side">
        <section class="surface live-activity"><header class="section-header"><h2>Live Activity</h2><button>View all →</button></header>${activityRows()}</section>
        <section class="surface project-outputs"><header class="section-header"><h2>Project Outputs</h2><button>View all →</button></header><div><article>${icon('▤','mint')}<span><strong>Product Strategy</strong><small>strategy-v1.md</small></span><b>✓</b></article><article>${icon('✣','purple')}<span><strong>UX Design</strong><small>In progress</small></span><b class="loading-dot"></b></article><article>${icon('◇','blue')}<span><strong>Architecture</strong><small>Pending</small></span><b></b></article><article>${icon('☷','amber')}<span><strong>Engineering Plan</strong><small>Pending</small></span><b></b></article></div></section>
      </aside>
    </section>`;
}

function simpleViewTemplate(kind) {
  const config = {
    artifacts: ['Artifacts', 'Review, approve, and share everything your agent team produces.', [['Product Strategy','Approved'],['Market Research','Approved'],['UX Flow','In review'],['Architecture','Pending'],['Engineering Plan','Pending']]],
    agents: ['Agents & Tools', 'See the specialist team and the tools each agent can use.', [['Product Strategist','Ready'],['Research Agent','Ready'],['UX Designer','Working'],['Solution Architect','Queued'],['Engineering Planner','Queued']]],
    templates: ['Quick Start Templates', 'Start with a proven workflow, then tailor it to your idea.', [['SaaS Application','Idea to implementation'],['AI Product','Research to evaluation'],['Internal Tool','Workflow to rollout'],['Mobile App','Concept to release']]],
  }[kind];
  return `<section class="page-heading"><div><h1>${config[0]}</h1><p>${config[1]}</p></div><button class="primary-button new-project">＋ New Project</button></section><section class="collection-grid">${config[2].map((item,index)=>`<article class="surface collection-card">${icon(['▤','⌕','✣','◇','☷'][index%5],['purple','blue','mint','amber','coral'][index%5])}<div><h2>${item[0]}</h2><p>${item[1]}</p></div><button data-open="workspace">Open →</button></article>`).join('')}</section>`;
}

function architectureTemplate() {
  return `<section class="page-heading"><div><h1>Architecture</h1><p>A clear view of the system your agents have planned.</p></div><button class="primary-button">Export diagram ↓</button></section><section class="surface architecture-board"><header><div><span>PASSORFAIL.AI / SYSTEM V2</span><h2>Student risk prediction system</h2></div><span class="approved-badge">✓ Security reviewed</span></header><div class="architecture-flow"><article>${icon('▰','blue')}<h3>Next.js</h3><p>Instructor dashboard</p></article><b>→</b><article>${icon('&lt;/&gt;','purple')}<h3>FastAPI</h3><p>Application boundary</p></article><b>→</b><div class="architecture-stack"><article>${icon('▱','mint')}<h3>PostgreSQL</h3><p>Profiles + outcomes</p></article><article>${icon('✦','coral')}<h3>ML Service</h3><p>Risk + explanations</p></article><article>${icon('✣','amber')}<h3>Agent Runtime</h3><p>Workflow + tools</p></article></div></div></section>`;
}

function backlogTemplate() {
  const columns = [['Backlog',['Synthetic training dataset','Event audit log','Model fairness checks']],['Ready',['Student risk endpoint','Instructor authentication','Feature pipeline']],['In Progress',['Risk overview dashboard','Student signal schema']],['Done',['System architecture','Research brief','Product requirements']]];
  return `<section class="page-heading"><div><h1>Engineering Backlog</h1><p>18 implementation-ready tasks across four epics.</p></div><button class="primary-button">Export to Linear ↗</button></section><section class="kanban">${columns.map((column,i)=>`<div><header><h2>${column[0]}</h2><span>${column[1].length}</span></header>${column[1].map((task,n)=>`<article class="surface task-card"><small>${['ML','API','UI','ARCH'][i]}-${String(n+1).padStart(2,'0')}</small><h3>${task}</h3><p>${i===3?'Completed and approved for the next build phase.':'Implementation scope, acceptance criteria, and dependencies are ready.'}</p><footer><span>${3+n*2} pts</span><b>${i===3?'✓ Done':i===2?'● Active':'Planned'}</b></footer></article>`).join('')}</div>`).join('')}</section>`;
}

function render(view = currentView) {
  currentView = view;
  activeEventSource?.close();
  const templates = { dashboard: dashboardTemplate, workspace: () => projectTemplate(activeProject()), architecture: architectureTemplate, backlog: backlogTemplate, artifacts: () => simpleViewTemplate('artifacts'), agents: () => simpleViewTemplate('agents'), templates: () => simpleViewTemplate('templates') };
  app.innerHTML = (templates[view] || dashboardTemplate)();
  app.className = `main-content view-${view}`;
  document.querySelectorAll('.nav-item[data-view]').forEach(item => item.classList.toggle('active', item.dataset.view === view));
  bindInteractions();
  if (view === 'workspace' && activeProject().stage === 'strategist_running') resumeStrategist(activeProject());
  app.focus({ preventScroll: true });
}

function bindInteractions() {
  app.querySelectorAll('[data-view]').forEach(element => element.addEventListener('click', event => { event.preventDefault(); render(element.dataset.view); }));
  app.querySelectorAll('[data-open="workspace"]').forEach(element => element.addEventListener('click', () => { studioState.activeProjectId = null; saveState(); render('workspace'); }));
  app.querySelectorAll('[data-project-id]').forEach(element => element.addEventListener('click', () => { studioState.activeProjectId = element.dataset.projectId; saveState(); render('workspace'); }));
  app.querySelectorAll('.new-project').forEach(button => button.addEventListener('click', showCreateProject));
  app.querySelectorAll('.setup-button').forEach(button => button.addEventListener('click', showBackendSettings));
  app.querySelector('.approve-button:not(:disabled)')?.addEventListener('click', approveArtifact);
  app.querySelector('.revise-button')?.addEventListener('click', reviseArtifact);
  app.querySelector('.reject-button')?.addEventListener('click', rejectArtifact);
}

function showModal(content, className = '') {
  const modal = document.createElement('div');
  modal.className = `modal-backdrop ${className}`;
  modal.innerHTML = `<section class="modal-card" role="dialog" aria-modal="true">${content}</section>`;
  modal.addEventListener('click', event => { if (event.target === modal || event.target.closest('[data-close]')) modal.remove(); });
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('visible'));
  return modal;
}

function showCreateProject() {
  const modal = showModal(`<header><div><span class="eyebrow">NEW PROJECT</span><h2>What are you building?</h2><p>Give your agent team enough context to propose a focused plan.</p></div><button data-close>×</button></header><div class="modal-body"><label>PROJECT NAME<input class="project-name" value="CourseSignal" maxlength="40"></label><label>PRODUCT IDEA<textarea class="project-idea">An application that predicts early whether students are likely to pass or fail a course.</textarea></label><div class="form-row"><label>PROJECT TYPE<select><option>AI product</option><option>SaaS</option><option>Mobile app</option><option>API</option></select></label><label>GOAL<select><option>Production plan</option><option>Prototype</option><option>Explore</option></select></label></div><div class="approval-setting"><div><strong>Approval gates</strong><p>Pause after every major artifact.</p></div><button class="switch on"><i></i></button></div></div><footer><button class="secondary-button" data-close>Cancel</button><button class="primary-button" id="build-plan">Build product plan →</button></footer>`, 'create-modal');
  modal.querySelector('#build-plan').addEventListener('click', () => {
    const draft = { name: modal.querySelector('.project-name').value.trim() || 'Untitled project', idea: modal.querySelector('.project-idea').value.trim(), type: modal.querySelectorAll('select')[0].value, goal: modal.querySelectorAll('select')[1].value };
    if (!draft.idea) return showToast('Add a product idea before continuing');
    showExecutionPlan(modal, draft);
  });
}

function showExecutionPlan(modal, draft) {
  modal.querySelector('.modal-card').innerHTML = `<header><div><span class="eyebrow">PROPOSED WORKFLOW</span><h2>Your agent plan</h2><p>Five specialists · about four minutes</p></div><button data-close>×</button></header><div class="plan-list">${[['◎','Product Strategist','Define users, value, requirements, and boundaries'],['⌕','Research Agent','Investigate the market and supporting evidence'],['✣','UX Designer','Design the primary user workflow'],['◇','Solution Architect','Plan the technical system and data model'],['☷','Engineering Planner','Generate tasks, dependencies, and sequence']].map((row,i)=>`<article><b>${i+1}</b>${icon(row[0],['purple','blue','mint','amber','coral'][i])}<div><strong>${row[1]}</strong><p>${row[2]}</p></div></article>`).join('')}</div><div class="plan-note">♢ <span><strong>You stay in control.</strong> The workflow pauses after each major artifact for approval.</span></div><footer><button class="secondary-button" data-close>Edit idea</button><button class="primary-button" id="approve-plan">Approve &amp; start →</button></footer>`;
  modal.querySelector('#approve-plan').addEventListener('click', () => { modal.remove(); startProject(draft); });
}

async function startProject(draft) {
  const project = { id: `project-${Date.now()}`, ...draft, stage: 'strategist_running', readiness: 8, createdAt: Date.now(), strategistStartedAt: Date.now(), artifactVersion: 1 };
  if (apiUrl) {
    try {
      const backendProject = await apiRequest('/api/projects', { method: 'POST', body: JSON.stringify({ name: draft.name, idea: draft.idea, project_type: draft.type, goal: draft.goal }) });
      const run = await apiRequest(`/api/projects/${backendProject.id}/runs`, { method: 'POST' });
      project.backendProjectId = backendProject.id; project.backendRunId = run.id;
    } catch (error) { project.backendError = error.message; showToast('API unavailable · continuing locally'); }
  }
  studioState.projects.unshift(project); studioState.activeProjectId = project.id; saveState(); render('workspace'); showToast(`${project.name} started · Strategist is working`);
}

function resumeStrategist(project) {
  if (project.backendRunId) return connectRunEvents(project);
  clearTimeout(window.idea2shipRunTimer);
  const elapsed = Date.now() - project.strategistStartedAt;
  window.idea2shipRunTimer = setTimeout(() => completeStrategist(project.id), Math.max(400, 3200 - elapsed));
}

function connectRunEvents(project) {
  activeEventSource?.close();
  activeEventSource = new EventSource(`${apiUrl}/api/runs/${project.backendRunId}/events`);
  activeEventSource.addEventListener('approval.requested', async () => {
    try {
      const artifacts = await apiRequest(`/api/projects/${project.backendProjectId}/artifacts`);
      const artifact = artifacts[0]; const version = artifact?.versions?.at(-1);
      project.backendArtifactId = artifact?.id; project.artifactVersion = artifact?.current_version || 1; project.brief = version?.content || {}; project.stage = 'awaiting_approval'; project.readiness = 20; saveState(); activeEventSource.close(); render('workspace'); showToast('Product brief ready · approval required');
    } catch (error) { showToast(`Could not load artifact · ${error.message}`); }
  });
  activeEventSource.addEventListener('workflow.failed', () => { project.stage = 'failed'; saveState(); activeEventSource.close(); render('workspace'); showToast('Strategist run failed · check API settings'); });
}

function completeStrategist(projectId) {
  const project = studioState.projects.find(item => item.id === projectId);
  if (!project || project.stage !== 'strategist_running') return;
  project.stage = 'awaiting_approval'; project.readiness = 20; project.updatedAt = Date.now(); saveState(); render('workspace'); showToast('Product brief ready · approval required');
}

async function approveArtifact() {
  const project = activeProject();
  if (project.id === seededProject.id) return showToast('Artifact approved · workflow resumed');
  if (project.backendArtifactId) { try { await apiRequest(`/api/artifacts/${project.backendArtifactId}/approve`, { method: 'POST' }); } catch (error) { return showToast(`Approval failed · ${error.message}`); } }
  project.stage = 'strategist_approved'; project.readiness = 24; saveState(); render('workspace'); showToast('Brief approved · Research is ready');
}

function reviseArtifact() {
  const project = activeProject();
  const modal = showModal(`<header><div><span class="eyebrow">REVISION REQUEST</span><h2>Refine ${escapeHtml(project.name)}</h2></div><button data-close>×</button></header><div class="modal-body"><label>WHAT SHOULD CHANGE?<textarea>Make the primary user and measurable outcome more specific.</textarea></label></div><footer><button class="secondary-button" data-close>Cancel</button><button class="primary-button" id="send-revision">Send revision →</button></footer>`);
  modal.querySelector('#send-revision').addEventListener('click', async () => {
    const instructions = modal.querySelector('textarea').value.trim();
    if (project.backendArtifactId) { try { await apiRequest(`/api/artifacts/${project.backendArtifactId}/revise`, { method: 'POST', body: JSON.stringify({ instructions }) }); } catch (error) { return showToast(`Revision failed · ${error.message}`); } }
    if (project.id !== seededProject.id) { project.stage = 'strategist_running'; project.strategistStartedAt = Date.now(); project.readiness = 12; project.artifactVersion += 1; saveState(); }
    modal.remove(); render('workspace'); showToast('Revision sent · Strategist is working');
  });
}

async function rejectArtifact() {
  const project = activeProject();
  if (project.backendArtifactId) { try { await apiRequest(`/api/artifacts/${project.backendArtifactId}/reject`, { method: 'POST' }); } catch (error) { return showToast(`Regeneration failed · ${error.message}`); } }
  if (project.id !== seededProject.id) { project.stage = 'strategist_running'; project.strategistStartedAt = Date.now(); project.readiness = 10; saveState(); render('workspace'); }
  showToast('Brief returned to the Strategist');
}

function showBackendSettings() {
  const modal = showModal(`<header><div><span class="eyebrow">RUNTIME SETTINGS</span><h2>Connect the idea2ship API</h2><p>Use the included local service or a deployed HTTPS endpoint.</p></div><button data-close>×</button></header><div class="modal-body"><label>API BASE URL<input class="api-url" value="${escapeHtml(apiUrl || 'http://127.0.0.1:8000')}"></label><div class="connection-card ${apiUrl ? 'connected' : ''}"><i></i><div><strong>${apiUrl ? 'Endpoint configured' : 'Local demo mode'}</strong><p>${apiUrl ? escapeHtml(apiUrl) : 'Projects are saved in this browser.'}</p></div></div></div><footer><button class="secondary-button test-api">Test connection</button><button class="primary-button save-api">Save endpoint</button></footer>`, 'settings-modal');
  const input = modal.querySelector('.api-url');
  modal.querySelector('.test-api').addEventListener('click', async () => { try { const response = await fetch(`${input.value.trim().replace(/\/$/,'')}/health`); if (!response.ok) throw new Error(); const health = await response.json(); showToast(`API connected · ${health.agent_provider} provider`); } catch { showToast('Connection failed · check the URL'); } });
  modal.querySelector('.save-api').addEventListener('click', () => { apiUrl = input.value.trim().replace(/\/$/,''); localStorage.setItem('forge-api-url', apiUrl); modal.remove(); showToast('API endpoint saved'); });
}

function showToast(message) {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div'); toast.className = 'toast'; toast.innerHTML = `<span>✓</span>${message}`; document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show')); setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 220); }, 3000);
}

document.querySelectorAll('.sidebar [data-view]').forEach(element => element.addEventListener('click', event => { event.preventDefault(); render(element.dataset.view); }));
document.querySelectorAll('.sidebar .new-project, .topbar .new-project').forEach(button => button.addEventListener('click', showCreateProject));
document.querySelector('.sidebar .setup-button')?.addEventListener('click', showBackendSettings);
document.querySelector('.search-box input')?.addEventListener('keydown', event => { if (event.key === 'Enter') showToast(`Searching for “${event.currentTarget.value}”`); });
render(studioState.activeProjectId ? 'workspace' : 'dashboard');

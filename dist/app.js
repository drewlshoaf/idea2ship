const app = document.querySelector('#app');
const workspaceView = app.innerHTML;
const STORE_KEY = 'forge-studio-state-v1';
let currentView = 'workspace';
let studioState = loadStudioState();
let apiUrl = localStorage.getItem('forge-api-url') || '';
let activeEventSource = null;

function loadStudioState() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || { projects: [], activeProjectId: null };
  } catch {
    return { projects: [], activeProjectId: null };
  }
}

function saveStudioState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(studioState));
}

function activeProject() {
  return studioState.projects.find(project => project.id === studioState.activeProjectId) || null;
}

function escapeHtml(value = '') {
  return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function initials(name) {
  return name.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase() || 'NP';
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || `Request failed (${response.status})`);
  }
  return response.json();
}

const dashboardView = `
  <section class="workspace-head dashboard-title">
    <div><div class="breadcrumb"><span>Portfolio</span><b>/</b><span>Product studio</span></div><h1>Good afternoon, Drew.</h1></div>
    <button class="primary-button new-project" type="button">New project <span>＋</span></button>
  </section>
  <section class="dash-grid">
    <article class="dash-intro"><div><span class="orange-label">STUDIO OVERVIEW</span><h2>From idea to a plan<br><em>your team can build.</em></h2></div><p>Coordinate specialist agents, inspect every tool call, and approve the decisions that shape your product.</p><div class="dash-run"><span class="live-dot"></span><strong>1 run active</strong><span>PassOrFail.ai · UX design</span></div></article>
    <article class="metric-card"><span>ACTIVE PROJECTS</span><strong>03</strong><small>+1 this week</small></article>
    <article class="metric-card"><span>AGENT RUNS</span><strong>28</strong><small>96% successful</small></article>
    <article class="metric-card"><span>ARTIFACTS</span><strong>146</strong><small>12 awaiting review</small></article>
    <article class="metric-card accent"><span>APPROVALS PENDING</span><strong>04</strong><small>Needs your attention</small></article>
  </section>
  <section class="projects-section">
    <div class="section-title"><div><span class="orange-label">RECENT WORK</span><h2>Projects</h2></div><div class="project-filters"><button class="active">All</button><button>Active</button><button>Complete</button></div></div>
    <div class="project-grid">
      <article class="project-card featured" data-open="workspace"><div class="project-top"><span class="project-code">PF</span><span class="project-status active-status"><i></i> In progress</span></div><div><span class="project-domain">EDUCATION / PREDICTIVE ANALYTICS</span><h3>PassOrFail.ai</h3><p>Early-warning intelligence that helps instructors intervene before students fall behind.</p></div><div class="progress-row"><div><span>READINESS</span><b>72%</b></div><progress value="72" max="100"></progress></div><div class="project-foot"><span>5 agents</span><span>18 artifacts</span><time>Updated now</time></div></article>
      <article class="project-card"><div class="project-top"><span class="project-code blue">AP</span><span class="project-status"><i></i> In progress</span></div><div><span class="project-domain">INFRASTRUCTURE / FINTECH</span><h3>AgentPay</h3><p>Programmable payment rails and policy controls for autonomous software agents.</p></div><div class="progress-row"><div><span>READINESS</span><b>41%</b></div><progress value="41" max="100"></progress></div><div class="project-foot"><span>4 agents</span><span>9 artifacts</span><time>2h ago</time></div></article>
      <article class="project-card"><div class="project-top"><span class="project-code green">SG</span><span class="project-status complete-status">✓ Complete</span></div><div><span class="project-domain">EDTECH / ADAPTIVE LEARNING</span><h3>StudyGraph</h3><p>A knowledge graph that adapts course material to each learner's progress.</p></div><div class="progress-row"><div><span>READINESS</span><b>100%</b></div><progress value="100" max="100"></progress></div><div class="project-foot"><span>5 agents</span><span>32 artifacts</span><time>Sep 08</time></div></article>
    </div>
  </section>`;

const architectureView = `
  <section class="workspace-head"><div><div class="breadcrumb"><span>PassOrFail.ai</span><b>/</b><span>System design</span></div><h1>Architecture canvas</h1></div><div class="head-actions"><button class="ghost-button" id="fit-map">Fit view</button><button class="primary-button">Export diagram <span>↓</span></button></div></section>
  <section class="architecture-shell">
    <aside class="arch-info"><span class="orange-label">ARCHITECTURE / V2</span><h2>Student risk<br>prediction system</h2><p>A modular inference pipeline keeps personally identifiable information separate from model features and explanations.</p><div class="arch-key"><span><i class="key-blue"></i> Interface</span><span><i class="key-green"></i> Data</span><span><i class="key-orange"></i> Intelligence</span></div><dl><div><dt>Services</dt><dd>07</dd></div><div><dt>Data stores</dt><dd>02</dd></div><div><dt>External tools</dt><dd>03</dd></div></dl><div class="security-note"><span>◇</span><div><strong>Security reviewed</strong><p>FERPA boundaries documented</p></div></div></aside>
    <div class="canvas-wrap" id="canvas-wrap"><div class="canvas-grid">
      <div class="arch-node ui-node" style="--x:8%;--y:36%"><span>INTERFACE</span><strong>Next.js</strong><small>Instructor dashboard</small><b>UI</b></div>
      <div class="arch-node api-node" style="--x:31%;--y:36%"><span>API</span><strong>FastAPI</strong><small>Application boundary</small><b>AP</b></div>
      <div class="arch-node data-node" style="--x:57%;--y:14%"><span>DATA</span><strong>PostgreSQL</strong><small>Profiles + outcomes</small><b>DB</b></div>
      <div class="arch-node agent-node selected-node" style="--x:57%;--y:40%"><span>ORCHESTRATION</span><strong>Agent runtime</strong><small>Workflow + tools</small><b>AR</b></div>
      <div class="arch-node ml-node" style="--x:57%;--y:68%"><span>INTELLIGENCE</span><strong>ML service</strong><small>Risk + explanations</small><b>ML</b></div>
      <div class="arch-node mcp-node" style="--x:75%;--y:40%"><span>TOOLS</span><strong>MCP servers</strong><small>Search · GitHub · files</small><b>MC</b></div>
      <svg class="connectors" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true"><path d="M215 285 C260 285 275 285 315 285"/><path d="M465 285 C515 285 515 140 575 140"/><path d="M465 285 C520 285 525 300 575 300"/><path d="M465 285 C515 285 520 455 575 455"/><path d="M720 300 C760 300 775 300 820 300"/></svg>
      <div class="canvas-controls"><button aria-label="Zoom in">＋</button><button aria-label="Zoom out">−</button><button aria-label="Center diagram">◎</button></div>
    </div></div>
    <aside class="node-detail"><div class="panel-head"><span>NODE DETAIL</span><button>×</button></div><div class="node-detail-body"><span class="node-logo">AR</span><span class="orange-label">ORCHESTRATION</span><h3>Agent runtime</h3><p>Coordinates specialist agents, assembles context, records tool calls, and enforces human approval gates.</p><h4>RESPONSIBILITIES</h4><ul><li>Workflow state management</li><li>Context assembly</li><li>Tool permission enforcement</li><li>Event streaming</li></ul><h4>CONNECTIONS</h4><div class="connection-pill">↗ MCP servers</div><div class="connection-pill">↙ FastAPI</div></div></aside>
  </section>`;

const backlogView = `
  <section class="workspace-head"><div><div class="breadcrumb"><span>PassOrFail.ai</span><b>/</b><span>Engineering plan</span></div><h1>Generated backlog</h1></div><div class="head-actions"><button class="ghost-button">Dependencies</button><button class="primary-button">Export to Linear <span>↗</span></button></div></section>
  <section class="backlog-summary"><div><span class="orange-label">BUILD PLAN / V1</span><h2>18 tasks across 4 epics</h2></div><div class="backlog-metrics"><span><b>38</b> points</span><span><b>6</b> weeks</span><span><b>3</b> milestones</span></div><button class="ready-pill">✓ Approved for build</button></section>
  <section class="kanban" aria-label="Engineering backlog">
    <div class="kanban-column"><header><div><span>BACKLOG</span><b>7</b></div><button>＋</button></header><article class="task-card high"><div><span class="task-type">ML-04</span><span class="priority">HIGH</span></div><h3>Generate synthetic training dataset</h3><p>Create balanced student records with explainable risk signals.</p><footer><span class="agent-mini">▤</span><span>5 pts</span><i>ML PIPELINE</i></footer></article><article class="task-card"><div><span class="task-type">PLAT-08</span></div><h3>Event audit log</h3><p>Persist workflow and approval events for complete traceability.</p><footer><span class="agent-mini">▤</span><span>3 pts</span><i>PLATFORM</i></footer></article><article class="task-card"><div><span class="task-type">QA-02</span></div><h3>Model fairness checks</h3><p>Measure performance across configured demographic cohorts.</p><footer><span class="agent-mini">✓</span><span>5 pts</span><i>QUALITY</i></footer></article></div>
    <div class="kanban-column"><header><div><span>READY</span><b>5</b></div><button>＋</button></header><article class="task-card high"><div><span class="task-type">API-01</span><span class="priority">HIGH</span></div><h3>Student risk endpoint</h3><p>Return score, confidence, and contributing factors.</p><div class="dependency">↳ Requires DATA-02</div><footer><span class="agent-mini">▤</span><span>3 pts</span><i>API</i></footer></article><article class="task-card"><div><span class="task-type">AUTH-01</span></div><h3>Instructor authentication</h3><p>Add role-based access for instructors and administrators.</p><footer><span class="agent-mini">▤</span><span>3 pts</span><i>PLATFORM</i></footer></article><article class="task-card"><div><span class="task-type">ML-02</span></div><h3>Feature pipeline</h3><p>Transform attendance, assessment, and engagement signals.</p><footer><span class="agent-mini">▤</span><span>5 pts</span><i>ML PIPELINE</i></footer></article></div>
    <div class="kanban-column active-column"><header><div><span>IN PROGRESS</span><b>3</b></div><button>＋</button></header><article class="task-card selected"><div><span class="task-type">UI-03</span><span class="priority">ACTIVE</span></div><h3>Risk overview dashboard</h3><p>Surface prioritized students with confidence and trend context.</p><div class="task-progress"><i style="width:68%"></i></div><footer><span class="agent-mini orange">◇</span><span>5 pts</span><i>EXPERIENCE</i></footer></article><article class="task-card"><div><span class="task-type">DATA-02</span></div><h3>Student signal schema</h3><p>Model normalized academic and behavioral observations.</p><footer><span class="agent-mini">⬡</span><span>3 pts</span><i>DATA</i></footer></article></div>
    <div class="kanban-column"><header><div><span>DONE</span><b>3</b></div><button>＋</button></header><article class="task-card done-card"><div><span class="task-type">ARCH-01</span><span class="complete-tag">✓ DONE</span></div><h3>System architecture</h3><p>Define service boundaries and secure data pathways.</p><footer><span class="agent-mini">⬡</span><span>3 pts</span><i>ARCHITECTURE</i></footer></article><article class="task-card done-card"><div><span class="task-type">UX-01</span><span class="complete-tag">✓ DONE</span></div><h3>Instructor journey</h3><p>Map review, evidence, and intervention workflow.</p><footer><span class="agent-mini orange">◇</span><span>3 pts</span><i>EXPERIENCE</i></footer></article></div>
  </section>`;

function dashboardWithProjects() {
  if (!studioState.projects.length) return dashboardView;
  const cards = studioState.projects.map(project => {
    const waiting = project.stage === 'awaiting_approval';
    const status = waiting ? 'Approval needed' : project.stage === 'strategist_running' ? 'Strategist working' : 'In progress';
    return `<article class="project-card featured saved-project" data-project-id="${project.id}"><div class="project-top"><span class="project-code">${initials(project.name)}</span><span class="project-status ${waiting ? 'needs-approval' : 'active-status'}"><i></i> ${status}</span></div><div><span class="project-domain">${escapeHtml(project.type.toUpperCase())} / ${escapeHtml(project.goal.toUpperCase())}</span><h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.idea)}</p></div><div class="progress-row"><div><span>READINESS</span><b>${project.readiness}%</b></div><progress value="${project.readiness}" max="100"></progress></div><div class="project-foot"><span>5 agents</span><span>${project.stage === 'awaiting_approval' ? '1 artifact' : 'Run active'}</span><time>Updated now</time></div></article>`;
  }).join('');
  return dashboardView
    .replace('<strong>03</strong><small>+1 this week</small>', `<strong>${String(3 + studioState.projects.length).padStart(2, '0')}</strong><small>+${studioState.projects.length} created here</small>`)
    .replace('<strong>04</strong><small>Needs your attention</small>', `<strong>${String(4 + studioState.projects.filter(project => project.stage === 'awaiting_approval').length).padStart(2, '0')}</strong><small>Needs your attention</small>`)
    .replace('<div class="project-grid">', `<div class="project-grid">${cards}`);
}

function generatedWorkspace(project) {
  const working = project.stage === 'strategist_running';
  const approved = project.stage === 'strategist_approved';
  const brief = project.brief || {};
  const targetUser = brief.target_users?.[0] || 'Primary operator';
  const features = brief.mvp_features?.slice(0, 3) || ['Capture the minimum useful inputs', 'Produce a clear, explainable output', 'Close the loop with a recommended action'];
  const statusLabel = working ? 'Structuring product brief' : approved ? 'Brief approved' : 'Waiting for your approval';
  const artifact = working ? `
    <article class="document run-document"><div class="generation-state"><span class="spinner"></span><div><strong>Strategist is shaping the brief</strong><p>Clarifying the user, problem, MVP boundary, and success measures.</p></div></div><div class="skeleton-line wide"></div><div class="skeleton-line title"></div><div class="skeleton-line medium"></div><hr><div class="skeleton-grid"><span></span><div><i></i><i></i><i></i></div></div><div class="thinking-log"><span>LIVE REASONING TRACE</span><p class="trace-line">Separating the core job from implementation details…</p></div></article>` : `
    <article class="document generated-document"><div class="approval-banner ${approved ? '' : 'pending-banner'}"><span>${approved ? '✓' : '!'}</span><p><strong>${approved ? 'Approved artifact' : 'Approval required'}</strong><br>${approved ? 'Research may now use this version.' : 'Review this brief before downstream agents continue.'}</p><time>NOW</time></div><div class="doc-kicker">PRODUCT BRIEF / 01</div><h2>${escapeHtml(project.name)}<br><em>from idea to focus.</em></h2><p class="lede">${escapeHtml(brief.product_definition || project.idea)}</p><hr><div class="doc-section"><span>01</span><div><h3>Problem</h3><p>${escapeHtml(brief.problem || 'The current experience is fragmented, difficult to evaluate, and lacks a clear path from raw input to a confident decision.')}</p></div></div><div class="doc-section"><span>02</span><div><h3>Primary user</h3><div class="user-card"><span>${initials(targetUser)}</span><div><strong>${escapeHtml(targetUser)}</strong><p>${escapeHtml(brief.value_proposition || "The person responsible for acting on the product's central insight.")}</p></div></div></div></div><div class="doc-section"><span>03</span><div><h3>MVP outcomes</h3><ul>${features.map((feature, index) => `<li><i>${index + 1}</i>${escapeHtml(feature)}</li>`).join('')}</ul></div></div></article>`;
  const reviewBar = working ? `<div class="review-bar run-review"><span>Approval controls unlock when the artifact is ready.</span><button class="approve-button" disabled>Generating…</button></div>` : approved ? `<div class="review-bar"><div><button class="ghost-button dashboard-return">View projects</button></div><button class="approve-button"><span>✓</span> Approved</button></div>` : `<div class="review-bar"><div><button class="danger-button generated-reject">Reject</button><button class="ghost-button generated-revise">Revise</button></div><button class="approve-button approve-generated">Approve & continue →</button></div>`;
  const connected = Boolean(project.backendProjectId);
  return `<section class="workspace-head"><div><div class="breadcrumb"><span>${escapeHtml(project.name)}</span><b>/</b><span>Product definition</span></div><h1>Agent workspace</h1></div><div class="head-actions"><button class="ghost-button">Pause run</button><button class="primary-button dashboard-return">View projects <span>↗</span></button></div></section><div class="demo-notice ${connected ? 'connected-notice' : ''}"><span>${connected ? 'API CONNECTED' : 'LOCAL DEMO RUN'}</span><p>${connected ? 'Projects, workflow events, artifact versions, and approvals are persisted by Forge API.' : 'This project is saved on this device. Configure the API in Setup to use the service layer.'}</p></div><section class="control-grid dynamic-control"><aside class="agents-panel panel"><div class="panel-head"><span>EXECUTION GRAPH</span><button>•••</button></div><div class="graph-status"><strong>5 agents</strong><span>${working ? '1 active · 4 queued' : approved ? '1 complete · 1 queued' : '1 waiting · 4 queued'}</span></div><div class="agent-graph"><article class="agent-card ${working ? 'running' : 'complete'}"><div class="agent-icon strategy">◈</div><div><h3>Strategist</h3><p>${statusLabel}</p></div>${working ? '<span class="pulse-ring"></span>' : '<span class="status-icon">✓</span>'}</article><div class="flow-line muted"></div><article class="agent-card waiting"><div class="agent-icon research">⌕</div><div><h3>Researcher</h3><p>${approved ? 'Ready to start' : 'Waiting for approval'}</p></div><span class="status-icon">○</span></article><div class="flow-line muted"></div><article class="agent-card waiting"><div class="agent-icon ux">◇</div><div><h3>UX Designer</h3><p>Queued</p></div><span class="status-icon">○</span></article><div class="flow-line muted"></div><article class="agent-card waiting"><div class="agent-icon architecture">⬡</div><div><h3>Architect</h3><p>Queued</p></div><span class="status-icon">○</span></article><div class="flow-line muted"></div><article class="agent-card waiting"><div class="agent-icon engineer">▤</div><div><h3>Engineer</h3><p>Queued</p></div><span class="status-icon">○</span></article></div><div class="agent-metrics"><span><b>${working ? '1.8k' : '2.4k'}</b> tokens</span><span><b>0</b> tool calls</span></div></aside><section class="artifact-panel panel"><div class="artifact-toolbar"><div><span class="file-icon">▧</span><div><h2>Product requirements</h2><p>${working ? 'Generating version 1' : `Version ${project.artifactVersion || 1} · Generated by Strategist`}</p></div></div><div class="artifact-actions"><button>v${project.artifactVersion || 1}⌄</button><button>•••</button></div></div>${artifact}${reviewBar}</section><aside class="activity-panel panel"><div class="panel-head"><span>LIVE ACTIVITY</span><button>≡</button></div><div class="activity-summary"><span class="live-dot"></span><strong>${working ? 'Run in progress' : approved ? 'Run resumed' : 'Run paused'}</strong><small>${connected ? 'API events' : 'Saved locally'}</small></div><div class="activity-stream"><article class="activity-item active-event"><time>NOW</time><div class="timeline-mark ${working ? '' : 'done'}"></div><div><strong>${working ? 'Strategist working' : approved ? 'Artifact approved' : 'Approval requested'}</strong><p>${working ? 'Defining the smallest coherent product' : approved ? 'Researcher is cleared to begin' : 'Product brief v1 is ready for review'}</p><span class="event-chip">${working ? 'WORKING' : approved ? 'APPROVED' : 'PAUSED'}</span></div></article><article class="activity-item"><time>NOW</time><div class="timeline-mark done"></div><div><strong>Execution plan approved</strong><p>Five specialist agents scheduled</p></div></article><article class="activity-item"><time>NOW</time><div class="timeline-mark done"></div><div><strong>Project created</strong><p>${escapeHtml(project.name)} · ${escapeHtml(project.type)}</p></div></article></div><div class="next-gate"><span>NEXT STEP</span><strong>${working ? 'Product brief' : approved ? 'Research report' : 'Your approval'}</strong><p>${working ? 'Expected shortly' : approved ? 'Ready for the next build phase' : 'Review the artifact to continue'}</p></div></aside></section>`;
}

const views = { workspace: workspaceView, dashboard: dashboardView, architecture: architectureView, backlog: backlogView };

function bindCommon() {
  document.querySelectorAll('button').forEach((button) => {
    button.addEventListener('pointerdown', () => button.classList.add('pressed'));
    button.addEventListener('pointerup', () => button.classList.remove('pressed'));
    button.addEventListener('pointerleave', () => button.classList.remove('pressed'));
  });
  document.querySelectorAll('[data-open="workspace"]').forEach(card => card.addEventListener('click', () => { studioState.activeProjectId = null; saveStudioState(); showView('workspace'); }));
  document.querySelectorAll('[data-project-id]').forEach(card => card.addEventListener('click', () => { studioState.activeProjectId = card.dataset.projectId; saveStudioState(); showView('workspace'); }));
  document.querySelector('.new-project')?.addEventListener('click', showCreateProject);
  document.querySelector('.tool-link')?.addEventListener('click', showToolCall);
  document.querySelector('.approve-button')?.addEventListener('click', toggleApproval);
  document.querySelector('.danger-button')?.addEventListener('click', () => showToast('Artifact returned to Strategist'));
  document.querySelector('.review-bar .ghost-button:not(.dashboard-return):not(.generated-revise)')?.addEventListener('click', showRevise);
  document.querySelector('.approve-generated')?.addEventListener('click', approveGeneratedArtifact);
  document.querySelector('.generated-revise')?.addEventListener('click', reviseGeneratedArtifact);
  document.querySelector('.generated-reject')?.addEventListener('click', rejectGeneratedArtifact);
  document.querySelectorAll('.dashboard-return').forEach(button => button.addEventListener('click', () => showView('dashboard')));
  document.querySelectorAll('.primary-button').forEach(button => button.addEventListener('click', () => {
    if (button.textContent.includes('View deliverables')) showView('dashboard');
  }));
  document.querySelectorAll('.project-filters button').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.project-filters button').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
  }));
  document.querySelectorAll('.arch-node').forEach(node => node.addEventListener('click', () => {
    document.querySelectorAll('.arch-node').forEach(item => item.classList.remove('selected-node'));
    node.classList.add('selected-node');
    const detail = document.querySelector('.node-detail h3');
    if (detail) detail.textContent = node.querySelector('strong').textContent;
  }));
}

function showView(name) {
  currentView = name;
  app.className = `workspace view-${name}`;
  const project = activeProject();
  app.innerHTML = name === 'dashboard' ? dashboardWithProjects() : name === 'workspace' && project ? generatedWorkspace(project) : views[name];
  const switcher = document.querySelector('.project-switcher button');
  if (switcher) switcher.innerHTML = `${escapeHtml(project && name === 'workspace' ? project.name : 'PassOrFail.ai')} <span>⌄</span>`;
  document.querySelectorAll('.rail-item[data-view]').forEach(item => item.classList.toggle('active', item.dataset.view === name));
  bindCommon();
  if (name === 'workspace' && project?.stage === 'strategist_running') resumeStrategist(project);
}

function showModal(content, extraClass = '') {
  const modal = document.createElement('div');
  modal.className = `modal-backdrop ${extraClass}`;
  modal.innerHTML = `<section class="modal-card" role="dialog" aria-modal="true">${content}</section>`;
  modal.addEventListener('click', event => { if (event.target === modal || event.target.closest('[data-close]')) modal.remove(); });
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('visible'), 10);
  return modal;
}

function showToolCall() {
  showModal(`<header><div><span class="orange-label">MCP INVOCATION / 008</span><h2>Web research completed</h2></div><button data-close aria-label="Close">×</button></header><div class="call-status"><span>✓</span><div><strong>Successful</strong><p>Completed in 1.24 seconds</p></div></div><dl class="tool-details"><div><dt>SERVER</dt><dd>search</dd></div><div><dt>TOOL</dt><dd>search_query</dd></div><div><dt>AGENT</dt><dd>Researcher</dd></div><div><dt>PERMISSION</dt><dd>Read only</dd></div></dl><div class="argument-block"><span>ARGUMENTS</span><code>{<br>&nbsp; "query": "student dropout prediction datasets",<br>&nbsp; "limit": 20<br>}</code></div><div class="result-block"><span>RESULT</span><strong>18 sources retained</strong><p>6 academic papers · 4 datasets · 8 implementation references</p></div><footer><button class="ghost-button" data-close>Close</button><button class="primary-button">Open full trace ↗</button></footer>`, 'tool-modal');
}

function showBackendSettings() {
  const modal = showModal(`<header><div><span class="orange-label">RUNTIME SETUP</span><h2>Connect Forge API</h2><p>Use the service locally or point Forge at a deployed HTTPS endpoint.</p></div><button data-close aria-label="Close">×</button></header><div class="backend-form"><label>API BASE URL<input class="api-url-input" value="${escapeHtml(apiUrl || 'http://127.0.0.1:8000')}" placeholder="https://api.example.com"></label><div class="connection-state ${apiUrl ? 'configured' : ''}"><span></span><div><strong>${apiUrl ? 'Endpoint configured' : 'Demo mode active'}</strong><p>${apiUrl ? escapeHtml(apiUrl) : 'Projects are currently stored only on this device.'}</p></div></div><p class="setup-help">Start the included FastAPI service, test the connection, then save. New projects will use persisted runs, artifacts, approvals, and SSE events.</p></div><footer><button class="danger-button disconnect-api" ${apiUrl ? '' : 'disabled'}>Disconnect</button><button class="ghost-button test-api">Test connection</button><button class="primary-button save-api">Save endpoint</button></footer>`, 'settings-modal');
  const input = modal.querySelector('.api-url-input');
  modal.querySelector('.test-api').addEventListener('click', async () => {
    const candidate = input.value.trim().replace(/\/$/, '');
    try {
      const response = await fetch(`${candidate}/health`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const health = await response.json();
      showToast(`Forge API connected · ${health.agent_provider} provider`);
    } catch {
      showToast('Connection failed · Start the API and check this URL');
    }
  });
  modal.querySelector('.save-api').addEventListener('click', () => {
    apiUrl = input.value.trim().replace(/\/$/, '');
    localStorage.setItem('forge-api-url', apiUrl);
    modal.remove();
    showToast('API endpoint saved · New projects will use it');
  });
  modal.querySelector('.disconnect-api').addEventListener('click', () => {
    apiUrl = '';
    localStorage.removeItem('forge-api-url');
    modal.remove();
    showToast('API disconnected · Local demo mode is active');
  });
}

function showRevise() {
  const modal = showModal(`<header><div><span class="orange-label">REVISION REQUEST</span><h2>Redirect the Strategist</h2></div><button data-close>×</button></header><label class="revision-label">What should change?<textarea autofocus>Focus the MVP on course instructors rather than administrators.</textarea></label><div class="revision-options"><label><input type="checkbox" checked> Preserve approved sections</label><label><input type="checkbox" checked> Create version 4</label></div><footer><button class="ghost-button" data-close>Cancel</button><button class="primary-button" id="send-revision">Send revision →</button></footer>`, 'revision-modal');
  modal.querySelector('#send-revision').addEventListener('click', () => { modal.remove(); showToast('Revision sent · Strategist is working'); });
}

function showCreateProject() {
  const modal = showModal(`<header><div><span class="orange-label">NEW PROJECT</span><h2>What are you trying to build?</h2></div><button data-close>×</button></header><label class="project-name-label">PROJECT NAME<input class="project-name-input" value="CourseSignal" maxlength="40"></label><textarea class="idea-input" autofocus>An application that predicts early whether students are likely to pass or fail a course.</textarea><div class="form-row"><label>PROJECT TYPE<select><option>AI product</option><option>SaaS</option><option>Mobile app</option><option>API</option></select></label><label>GOAL<select><option>Production plan</option><option>Prototype</option><option>Explore</option></select></label></div><div class="guardrail-row"><div><span>Approval gates</span><small>Pause after every major artifact</small></div><button class="toggle on" aria-label="Toggle approval gates"><i></i></button></div><footer><button class="ghost-button" data-close>Cancel</button><button class="primary-button" id="build-plan">Build product plan →</button></footer>`, 'create-modal');
  modal.querySelector('#build-plan').addEventListener('click', () => {
    const draft = { name: modal.querySelector('.project-name-input').value.trim() || 'Untitled project', idea: modal.querySelector('.idea-input').value.trim(), type: modal.querySelectorAll('select')[0].value, goal: modal.querySelectorAll('select')[1].value };
    if (!draft.idea) return showToast('Add a product idea before continuing');
    showExecutionPlan(modal, draft);
  });
}

function showExecutionPlan(modal, draft) {
  modal.querySelector('.modal-card').innerHTML = `<header><div><span class="orange-label">PROPOSED EXECUTION</span><h2>Your agent plan</h2><p>Five specialists · estimated 4 minutes</p></div><button data-close>×</button></header><div class="plan-list"><article><b>1</b><span class="agent-icon strategy">◈</span><div><strong>Product Strategist</strong><p>Define users, value, requirements, and boundaries</p></div><i>••</i></article><article><b>2</b><span class="agent-icon research">⌕</span><div><strong>Research Agent</strong><p>Investigate student-risk approaches and evidence</p></div><i>••</i></article><article><b>3</b><span class="agent-icon ux">◇</span><div><strong>UX Designer</strong><p>Design the instructor review workflow</p></div><i>••</i></article><article><b>4</b><span class="agent-icon architecture">⬡</span><div><strong>Solution Architect</strong><p>Define application and ML system architecture</p></div><i>••</i></article><article><b>5</b><span class="agent-icon engineer">▤</span><div><strong>Engineering Planner</strong><p>Generate backlog, dependencies, and sequence</p></div><i>••</i></article></div><div class="plan-note"><span>◇</span><p><strong>Human control is on.</strong> Forge will pause after each major artifact for your approval.</p></div><footer><button class="ghost-button" data-close>Edit idea</button><button class="primary-button" id="approve-plan">Approve & start run →</button></footer>`;
  modal.querySelector('#approve-plan').addEventListener('click', () => { modal.remove(); startProject(draft); });
}

async function startProject(draft) {
  const project = { id: `project-${Date.now()}`, ...draft, stage: 'strategist_running', readiness: 8, createdAt: Date.now(), strategistStartedAt: Date.now() };
  if (apiUrl) {
    try {
      const backendProject = await apiRequest('/api/projects', { method: 'POST', body: JSON.stringify({ name: draft.name, idea: draft.idea, project_type: draft.type, goal: draft.goal }) });
      const run = await apiRequest(`/api/projects/${backendProject.id}/runs`, { method: 'POST' });
      project.backendProjectId = backendProject.id;
      project.backendRunId = run.id;
    } catch (error) {
      project.backendError = error.message;
      showToast('API unavailable · continuing in local demo mode');
    }
  }
  studioState.projects.unshift(project);
  studioState.activeProjectId = project.id;
  saveStudioState();
  showView('workspace');
  showToast(`${project.name} started · Strategist is working`);
}

function resumeStrategist(project) {
  if (project.backendRunId) {
    connectRunEvents(project);
    return;
  }
  clearTimeout(window.forgeRunTimer);
  const elapsed = Date.now() - project.strategistStartedAt;
  window.forgeRunTimer = setTimeout(() => completeStrategist(project.id), Math.max(400, 3200 - elapsed));
}

function connectRunEvents(project) {
  activeEventSource?.close();
  activeEventSource = new EventSource(`${apiUrl}/api/runs/${project.backendRunId}/events`);
  activeEventSource.addEventListener('approval.requested', async () => {
    try {
      const artifacts = await apiRequest(`/api/projects/${project.backendProjectId}/artifacts`);
      const artifact = artifacts[0];
      const version = artifact?.versions?.at(-1);
      project.backendArtifactId = artifact?.id;
      project.artifactVersion = artifact?.current_version || 1;
      project.brief = version?.content || {};
      project.stage = 'awaiting_approval';
      project.readiness = 20;
      saveStudioState();
      activeEventSource.close();
      if (currentView === 'workspace' && studioState.activeProjectId === project.id) showView('workspace');
      showToast('Product brief ready · Your approval is required');
    } catch (error) {
      showToast(`Could not load artifact · ${error.message}`);
    }
  });
  activeEventSource.addEventListener('workflow.failed', () => {
    project.stage = 'failed';
    saveStudioState();
    activeEventSource.close();
    showToast('Strategist run failed · Check the API configuration');
  });
}

function completeStrategist(projectId) {
  const project = studioState.projects.find(item => item.id === projectId);
  if (!project || project.stage !== 'strategist_running') return;
  project.stage = 'awaiting_approval';
  project.readiness = 18;
  project.artifactVersion = 1;
  project.updatedAt = Date.now();
  saveStudioState();
  if (currentView === 'workspace' && studioState.activeProjectId === projectId) showView('workspace');
  showToast('Product brief ready · Your approval is required');
}

async function approveGeneratedArtifact() {
  const project = activeProject();
  if (!project) return;
  if (project.backendArtifactId) {
    try {
      await apiRequest(`/api/artifacts/${project.backendArtifactId}/approve`, { method: 'POST' });
    } catch (error) {
      return showToast(`Approval failed · ${error.message}`);
    }
  }
  project.stage = 'strategist_approved';
  project.readiness = 24;
  project.approvedAt = Date.now();
  saveStudioState();
  showView('workspace');
  showToast('Brief approved · Research is ready to begin');
}

function reviseGeneratedArtifact() {
  const project = activeProject();
  const modal = showModal(`<header><div><span class="orange-label">REVISION REQUEST</span><h2>Refine ${escapeHtml(project.name)}</h2></div><button data-close>×</button></header><label class="revision-label">What should change?<textarea autofocus>Make the primary user and measurable outcome more specific.</textarea></label><div class="revision-options"><label><input type="checkbox" checked> Preserve the original idea</label><label><input type="checkbox" checked> Create version 2</label></div><footer><button class="ghost-button" data-close>Cancel</button><button class="primary-button" id="send-generated-revision">Send revision →</button></footer>`, 'revision-modal');
  modal.querySelector('#send-generated-revision').addEventListener('click', async () => {
    const instructions = modal.querySelector('textarea').value.trim();
    if (project.backendArtifactId) {
      try {
        await apiRequest(`/api/artifacts/${project.backendArtifactId}/revise`, { method: 'POST', body: JSON.stringify({ instructions }) });
      } catch (error) {
        return showToast(`Revision failed · ${error.message}`);
      }
    }
    project.stage = 'strategist_running'; project.strategistStartedAt = Date.now(); project.readiness = 12; project.artifactVersion = (project.artifactVersion || 1) + 1; saveStudioState(); modal.remove(); showView('workspace'); showToast('Revision sent · Strategist is working');
  });
}

async function rejectGeneratedArtifact() {
  const project = activeProject();
  if (!project) return;
  if (project.backendArtifactId) {
    try {
      await apiRequest(`/api/artifacts/${project.backendArtifactId}/reject`, { method: 'POST' });
    } catch (error) {
      return showToast(`Regeneration failed · ${error.message}`);
    }
  }
  project.stage = 'strategist_running'; project.strategistStartedAt = Date.now(); project.readiness = 10; saveStudioState(); showView('workspace'); showToast('Brief rejected · Strategist is regenerating');
}

function toggleApproval(event) {
  const button = event.currentTarget;
  const reopened = button.classList.toggle('is-unapproved');
  button.innerHTML = reopened ? 'Approve & continue →' : '<span>✓</span> Approved';
  showToast(reopened ? 'Artifact reopened for review' : 'Artifact approved · Workflow resumed');
}

function showToast(message) {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>✓</span>${message}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 250); }, 3200);
}

document.querySelectorAll('.rail-item[data-view]').forEach(item => item.addEventListener('click', () => showView(item.dataset.view)));
document.querySelector('.rail-item[aria-label="Settings"]')?.addEventListener('click', showBackendSettings);
if (activeProject()) showView('workspace');
else bindCommon();

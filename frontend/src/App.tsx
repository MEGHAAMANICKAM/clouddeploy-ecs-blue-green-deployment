import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowDownToLine, Boxes, Check, ChevronDown, CircleDot, Cloud, GitBranch, History, LayoutDashboard, Menu, Play, RotateCcw, Server, Settings, ShieldCheck, Sparkles, Terminal, X } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { ApiDeployment, ApiEnvironments, ApiHealth, ApiVersion, fetchDashboardData } from "./services/api";

type EnvKey = "blue" | "green";
type Status = "Successful" | "Failed" | "In Progress" | "Rolled Back";
type HistoryItem = { id: string; version: string; environment: string; strategy: string; status: Status; started: string; completed: string; duration: string };
const chartData = [{ time: "08:00", cpu: 38, memory: 52 }, { time: "10:00", cpu: 46, memory: 57 }, { time: "12:00", cpu: 42, memory: 61 }, { time: "14:00", cpu: 58, memory: 64 }, { time: "16:00", cpu: 51, memory: 59 }, { time: "18:00", cpu: 48, memory: 62 }];
const initialHistory: HistoryItem[] = [
  { id: "dep-1048", version: "v1.0.0", environment: "Production", strategy: "Blue-Green", status: "Successful", started: "Jun 18, 10:42", completed: "Jun 18, 10:45", duration: "3m 24s" },
  { id: "dep-1047", version: "v0.9.4", environment: "Staging", strategy: "Rolling", status: "Successful", started: "Jun 17, 15:10", completed: "Jun 17, 15:12", duration: "2m 41s" },
  { id: "dep-1046", version: "v0.9.3", environment: "Production", strategy: "Blue-Green", status: "Rolled Back", started: "Jun 16, 08:30", completed: "Jun 16, 08:36", duration: "6m 08s" },
  { id: "dep-1045", version: "v0.9.2", environment: "Development", strategy: "Rolling", status: "Failed", started: "Jun 15, 11:24", completed: "Jun 15, 11:25", duration: "1m 02s" },
];
const nav = [{ label: "Overview", path: "/", icon: LayoutDashboard }, { label: "Deployments", path: "/deployments", icon: GitBranch }, { label: "Environments", path: "/environments", icon: Boxes }, { label: "Container Monitoring", path: "/monitoring", icon: Activity }, { label: "Deployment History", path: "/history", icon: History }, { label: "Settings", path: "/settings", icon: Settings }];

function App() {
  const location = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const [activeEnv, setActiveEnv] = useState<EnvKey>("blue");
  const [deploying, setDeploying] = useState(false);
  const [history, setHistory] = useState(initialHistory);
  const [filter, setFilter] = useState("All statuses");
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const [greenVersion, setGreenVersion] = useState("v2.0.0");
  const [loading, setLoading] = useState(false);
  const [apiData, setApiData] = useState<{ health: ApiHealth; version: ApiVersion; deployment: ApiDeployment; environments: ApiEnvironments } | null>(null);
  const requestRef = useRef<Promise<void> | null>(null);

  const refresh = async () => {
    if (requestRef.current) return requestRef.current;
    setLoading(true);
    setNotice("");
    setNoticeError(false);
    const request = fetchDashboardData()
      .then((data) => {
        setApiData(data);
        setActiveEnv(data.deployment.active_environment);
        setGreenVersion(data.environments.green.version);
        setNotice("Dashboard data refreshed from the CloudDeploy API.");
      })
      .catch((error: unknown) => {
        setApiData(null);
        setNoticeError(true);
        setNotice(error instanceof Error ? `Unable to refresh dashboard data: ${error.message}` : "Unable to refresh dashboard data.");
      })
      .finally(() => {
        setLoading(false);
        requestRef.current = null;
      });
    requestRef.current = request;
    return request;
  };

  useEffect(() => { void refresh(); }, []);

  const simulateDeploy = () => {
    if (deploying) return;
    const nextVersion = greenVersion === "v2.0.0" ? "v3.0.0" : "v2.0.0";
    setDeploying(true); setNoticeError(false); setNotice("Simulated deployment started — preparing GREEN environment.");
    window.setTimeout(() => {
      setGreenVersion(nextVersion); setActiveEnv("green"); setDeploying(false); setNotice("Deployment simulation complete — traffic shifted to GREEN.");
      setHistory((items) => [{ id: "dep-1049", version: nextVersion, environment: "Production", strategy: "Blue-Green", status: "Successful", started: "Just now", completed: "Just now", duration: "2m 18s" }, ...items]);
    }, 2200);
  };
  const rollback = () => { setActiveEnv("blue"); setNoticeError(false); setNotice("Rollback simulation successful — traffic restored to BLUE."); };
  const visibleHistory = useMemo(() => filter === "All statuses" ? history : history.filter((item) => item.status === filter), [filter, history]);
  const dashboardData = apiData;
  const displayedVersion = dashboardData?.version.version ? `v${dashboardData.version.version.replace(/^v/, "")}` : activeEnv === "blue" ? "v1.0.0" : greenVersion;
  const activeEnvironment = dashboardData?.version.environment || "Unavailable";
  const downloadDeploymentCsv = () => {
    if (!dashboardData) {
      setNoticeError(true);
      setNotice("Deployment data is unavailable. Refresh after the backend is connected.");
      return;
    }

    try {
      const activeEnvironmentData = dashboardData.environments[dashboardData.deployment.active_environment];
      const fields = ["Application name", "Application version", "Environment", "Deployment status", "Deployment strategy", "Deployment timestamp"];
      const values = [
        dashboardData.version.application,
        dashboardData.version.version,
        dashboardData.version.environment,
        activeEnvironmentData.status,
        dashboardData.deployment.strategy,
        dashboardData.deployment.updated_at,
      ];
      const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
      const csv = `${fields.map(escapeCsv).join(",")}\r\n${values.map(escapeCsv).join(",")}\r\n`;
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `clouddeploy-${dashboardData.version.version.replace(/^v/, "")}-deployment.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setNoticeError(false);
      setNotice("Deployment CSV downloaded successfully.");
    } catch (error: unknown) {
      setNoticeError(true);
      setNotice(error instanceof Error ? `Download failed: ${error.message}` : "Download failed.");
    }
  };

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Cloud size={19} /></div><span>cloud<span>deploy</span></span></div>
      <div className="workspace-switch"><span className="workspace-dot" /> clouddeploy-prod <ChevronDown size={14} /></div>
      <nav>{nav.map(({ label, path, icon: Icon }) => <NavLink key={label} to={path} end={path === "/"} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} onClick={() => setMobileNav(false)}><Icon size={17} /> {label}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="upgrade-card"><Sparkles size={16} /><strong>Ready to ship?</strong><span>Deploy with confidence.</span><button onClick={downloadDeploymentCsv}>Download deployment data <ArrowDownToLine size={13} /></button></div><div className="profile"><div className="avatar">AM</div><div><strong>Alex Morgan</strong><span>Admin</span></div></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)}><Menu /></button><div className="crumb"><span>Projects</span><b>/</b><strong>CloudDeploy</strong></div><div className="top-actions"><div className="env-selector"><span className="green-dot" /> Production <ChevronDown size={14} /></div><div className="top-version">{displayedVersion}</div><div className="avatar top-avatar">AM</div></div></header>
      <div className="content">
        <div className="page-heading"><div><p className="eyebrow"><CircleDot size={13} /> {location.pathname === "/" ? "SYSTEM OVERVIEW" : location.pathname.slice(1).replace("-", " ").toUpperCase()}</p><h1>Good morning, Alex <span>👋</span></h1><p className="subheading">Here&apos;s what&apos;s happening with your deployment infrastructure.</p></div><div className="heading-actions"><span className="live-pill"><span /> SIMULATED DATA</span><button className="secondary-btn" onClick={() => void refresh()} disabled={loading}><RotateCcw size={15} /> {loading ? "Refreshing..." : "Refresh"}</button></div></div>
        {notice && <div className={`notice ${noticeError ? "notice-error" : ""}`}><>{noticeError ? <X size={16} /> : <Check size={16} />}</> {notice}<button onClick={() => setNotice("")}><X size={15} /></button></div>}
        <Routes>
          <Route path="/" element={<Overview data={dashboardData} activeEnv={activeEnv} deploying={deploying} greenVersion={greenVersion} simulateDeploy={simulateDeploy} rollback={rollback} displayedVersion={displayedVersion} activeEnvironment={activeEnvironment} history={visibleHistory} filter={filter} setFilter={setFilter} />} />
          <Route path="/deployments" element={<RoutePage title="Deployments" description="Review simulated blue-green release activity." icon={<GitBranch />} />} />
          <Route path="/environments" element={<RoutePage title="Environments" description="Manage the simulated development, staging, and production environments." icon={<Boxes />} />} />
          <Route path="/monitoring" element={<RoutePage title="Container Monitoring" description="Inspect simulated CPU, memory, uptime, and health signals." icon={<Activity />} />} />
          <Route path="/history" element={<RoutePage title="Deployment History" description="Review deployment outcomes and simulated release durations." icon={<History />} />} />
          <Route path="/settings" element={<RoutePage title="Settings" description="CloudDeploy configuration will be managed here." icon={<Settings />} />} />
          <Route path="*" element={<RoutePage title="Page not found" description="The requested dashboard route does not exist." icon={<X />} />} />
        </Routes>
        <footer><span><Cloud size={14} /> CloudDeploy</span><span>Phase 1 · Simulation mode</span><span>API status <i className={dashboardData ? "green-dot" : "gray-dot"} /> {dashboardData ? "Operational" : "Unavailable"}</span></footer>
      </div>
    </main>
  </div>;
}

function Overview({ data, activeEnv, deploying, greenVersion, simulateDeploy, rollback, displayedVersion, activeEnvironment, history, filter, setFilter }: { data: { health: ApiHealth; version: ApiVersion; deployment: ApiDeployment; environments: ApiEnvironments } | null; activeEnv: EnvKey; deploying: boolean; greenVersion: string; simulateDeploy: () => void; rollback: () => void; displayedVersion: string; activeEnvironment: string; history: HistoryItem[]; filter: string; setFilter: (value: string) => void }) {
  const available = Boolean(data);
  return <><section className="stats-grid"><StatCard label="Application status" value={available ? "Healthy" : "Unavailable"} meta={available ? "All systems operational" : "Backend connection unavailable"} icon={<ShieldCheck />} accent="green" /><StatCard label="Current version" value={displayedVersion} meta={available ? "Latest production build" : "Waiting for API data"} icon={<GitBranch />} accent="blue" /><StatCard label="Active environment" value={activeEnvironment} meta={available ? "API-reported environment" : "Unavailable"} icon={<Server />} accent="purple" /><StatCard label="Deployment strategy" value={data?.deployment.strategy || "Unavailable"} meta={available ? "Zero-downtime releases" : "Unavailable"} icon={<Sparkles />} accent="amber" /></section>
    <div className="grid-two"><section className="panel deployment-panel"><PanelHeader title="Blue-Green deployment" subtitle="Traffic and environment status" action={<span className="simulated-tag">SIMULATED</span>} /><div className="traffic-summary"><div><span className="muted-label">CURRENT TRAFFIC</span><strong>{activeEnv === "blue" ? "BLUE" : "GREEN"} <em>{data?.deployment.traffic[activeEnv] ?? 0}%</em></strong></div><div className="traffic-track"><div className={`traffic-fill ${activeEnv}`} style={{ width: `${data?.deployment.traffic[activeEnv] ?? 0}%` }} /></div><div className="traffic-legend"><span><i className="blue-dot" /> BLUE <b>{data?.deployment.traffic.blue ?? 0}%</b></span><span><i className="green-dot" /> GREEN <b>{data?.deployment.traffic.green ?? 0}%</b></span></div></div><div className="env-cards"><EnvCard name="BLUE" version={data?.environments.blue.version || "Unavailable"} status={activeEnv === "blue" ? "Active" : "Standby"} health={data?.environments.blue.health || "Unavailable"} traffic={data?.environments.blue.traffic || 0} tone="blue" active={activeEnv === "blue"} /><div className="switch-arrow"><ChevronDown size={16} /></div><EnvCard name="GREEN" version={greenVersion} status={deploying ? "Deploying" : activeEnv === "green" ? "Active" : "Standby"} health={deploying ? "Provisioning" : data?.environments.green.health || "Unavailable"} traffic={activeEnv === "green" ? data?.environments.green.traffic || 100 : 0} tone="green" active={activeEnv === "green"} /></div><div className="deploy-actions"><button className="primary-btn" onClick={simulateDeploy} disabled={deploying}><Play size={15} fill="currentColor" /> {deploying ? "Deploying..." : "Simulate new deployment"}</button><button className="secondary-btn" onClick={rollback}><RotateCcw size={15} /> Simulate rollback</button></div></section><section className="panel info-panel"><PanelHeader title="Application information" subtitle="Production service details" action={<span className="healthy-pill"><span /> {available ? "Healthy" : "Unavailable"}</span>} /><div className="info-list">{[["Application name", data?.version.application || "Unavailable"], ["Current version", displayedVersion], ["Environment", activeEnvironment], ["Container platform", available ? "AWS ECS Fargate (simulated)" : "Unavailable"], ["Container port", available ? "8080" : "Unavailable"], ["Health endpoint", available ? "/health" : "Unavailable"]].map(([key, value]) => <div className="info-row" key={key}><span>{key}</span><strong>{value}</strong></div>)}</div><div className="endpoint"><Terminal size={15} /><span>API endpoint</span><code>{available ? "/api/health" : "Unavailable"}</code>{available ? <Check size={14} /> : <X size={14} />}</div></section></div>
    <section className="panel monitoring-panel"><PanelHeader title="Container monitoring" subtitle="Performance metrics from the last 12 hours" action={<span className="sample-label"><span /> Sample metrics</span>} /><div className="monitor-grid"><Metric label="CPU utilization" value="48.2%" meta="+4.8% from yesterday" color="#3367e8" /><Metric label="Memory utilization" value="62.4%" meta="-2.1% from yesterday" color="#1ca67a" /><Metric label="Container uptime" value="14d 06h" meta="Since Jun 04, 2024" color="#8b5cf6" /><Metric label="Restart count" value="2" meta="Last restart 4d ago" color="#f0a229" /></div><div className="chart-wrap"><div className="chart-title"><strong>Resource utilization</strong><span><i className="chart-blue" /> CPU <i className="chart-green" /> Memory</span></div><ResponsiveContainer width="100%" height={180}><AreaChart data={chartData}><XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#8a93a5" }} /><YAxis hide /><Tooltip /><Area type="monotone" dataKey="cpu" stroke="#3367e8" fill="#eaf0ff" strokeWidth={2} /><Area type="monotone" dataKey="memory" stroke="#1ca67a" fill="#e7f8f1" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></section>
    <section className="panel history-panel"><PanelHeader title="Deployment history" subtitle="Recent releases across all environments" action={<div className="filters"><select value={filter} onChange={(e) => setFilter(e.target.value)}><option>All statuses</option><option>Successful</option><option>Failed</option><option>Rolled Back</option><option>In Progress</option></select><button className="secondary-btn"><History size={14} /> View all</button></div>} /><div className="table-scroll"><table><thead><tr><th>DEPLOYMENT ID</th><th>VERSION</th><th>ENVIRONMENT</th><th>STATUS</th><th>START TIME</th><th>DURATION</th><th /></tr></thead><tbody>{history.map((item) => <tr key={item.id}><td><strong className="mono">{item.id}</strong></td><td><span className="version-badge">{item.version}</span></td><td>{item.environment}</td><td><StatusBadge status={item.status} /></td><td>{item.started}</td><td>{item.duration}</td><td><button className="more-btn">•••</button></td></tr>)}</tbody></table></div></section></>;
}

function RoutePage({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) { return <section className="panel route-page"><div className="route-page-icon">{icon}</div><h2>{title}</h2><p>{description}</p><span className="simulated-tag">SIMULATED DATA</span></section>; }
function StatCard({ label, value, meta, icon, accent }: { label: string; value: string; meta: string; icon: React.ReactNode; accent: string }) { return <div className="stat-card"><div className={`stat-icon ${accent}`}>{icon}</div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-meta">{meta}</span></div>; }
function PanelHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) { return <div className="panel-header"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>; }
function EnvCard({ name, version, status, health, traffic, tone, active }: { name: string; version: string; status: string; health: string; traffic: number; tone: string; active: boolean }) { return <div className={`env-card ${tone} ${active ? "is-active" : ""}`}><div className="env-card-top"><div className="env-name"><span className="env-symbol">{tone === "blue" ? <Cloud size={16} /> : <Boxes size={16} />}</span><strong>{name}</strong></div>{active && <span className="active-tag">RECEIVING TRAFFIC</span>}</div><div className="env-version">{version}</div><div className="env-details"><span><i className={active ? "green-dot" : "gray-dot"} /> {status}</span><span>{health}</span></div><div className="env-traffic"><span>Traffic</span><strong>{traffic}%</strong></div><div className="mini-track"><div style={{ width: `${traffic}%` }} /></div></div>; }
function Metric({ label, value, meta, color }: { label: string; value: string; meta: string; color: string }) { return <div className="metric"><span className="metric-label"><i style={{ background: color }} /> {label}</span><strong>{value}</strong><span className="metric-meta">{meta}</span></div>; }
function StatusBadge({ status }: { status: Status }) { return <span className={`status-badge ${status.toLowerCase().replace(/ /g, "-")}`}><i /> {status}</span>; }
export default App;


import { useEffect, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:5000/api/v1";

function App() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("All");
  const [form, setForm] = useState({
    company: "",
    role: "",
    status: "Applied",
    job_url: "",
    notes: "",
  });

  async function loadData() {
    try {
      setError("");
      const [appsResponse, statsResponse] = await Promise.all([
        fetch(`${API}/applications`),
        fetch(`${API}/dashboard`),
      ]);

      if (!appsResponse.ok || !statsResponse.ok) {
        throw new Error("Could not load dashboard data.");
      }

      const apps = await appsResponse.json();
      const dashboardStats = await statsResponse.json();

      setApplications(apps);
      setStats(dashboardStats);
    } catch {
      setError("Cannot connect to Flask. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  let cancelled = false;

  async function fetchInitialData() {
    try {
      const [appsResponse, statsResponse] = await Promise.all([
        fetch(`${API}/applications`),
        fetch(`${API}/dashboard`),
      ]);

      if (!appsResponse.ok || !statsResponse.ok) {
        throw new Error("Could not load dashboard data.");
      }

      const apps = await appsResponse.json();
      const dashboardStats = await statsResponse.json();

      if (!cancelled) {
        setApplications(apps);
        setStats(dashboardStats);
        setError("");
      }
    } catch {
      if (!cancelled) {
        setError("Cannot connect to Flask. Check that the backend is running.");
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  fetchInitialData();

  return () => {
    cancelled = true;
  };
}, []);

  async function addApplication(event) {
    event.preventDefault();

    try {
      const response = await fetch(`${API}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Could not add application.");
      }

      setForm({
        company: "",
        role: "",
        status: "Applied",
        job_url: "",
        notes: "",
      });

      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateStatus(id, status) {
    try {
      const response = await fetch(`${API}/applications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error("Could not update status.");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteApplication(id) {
    if (!window.confirm("Delete this job application?")) return;

    try {
      const response = await fetch(`${API}/applications/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Could not delete application.");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  const statuses = [
    "Applied",
    "Assessment",
    "Interview",
    "Offered",
    "Rejected",
    "Withdrawn",
  ];

  const filteredApplications =
    filter === "All"
      ? applications
      : applications.filter((app) => app.status === filter);

  const offerRate =
    applications.length > 0
      ? Math.round(((stats.offers || 0) / applications.length) * 100)
      : 0;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">P</span>
          <span>PathPilot</span>
        </div>

        <p className="nav-label">WORKSPACE</p>
        <div className="nav-item active">▦ &nbsp; Dashboard</div>
        <div className="nav-item">▤ &nbsp; Applications</div>
        <div className="nav-item">◷ &nbsp; Interviews</div>
        <div className="nav-item">▥ &nbsp; Analytics</div>

        <div className="sidebar-footer">
          <div className="avatar">H</div>
          <div>
            <strong>My Workspace</strong>
            <small>Placement journey</small>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">YOUR CAREER, ORGANIZED</span>
            <h1>Placement Dashboard</h1>
            <p>Track applications. Prepare for interviews. Land your next role.</p>
          </div>
          <button className="primary-btn" onClick={() => setShowForm(!showForm)}>
            + Add application
          </button>
        </header>

        {error && <div className="error-banner">{error}</div>}

        {showForm && (
          <form className="application-form" onSubmit={addApplication}>
            <h2>New job application</h2>
            <div className="form-grid">
              <label>
                Company *
                <input
                  required
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                  placeholder="e.g. Deloitte"
                />
              </label>

              <label>
                Job role *
                <input
                  required
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value })
                  }
                  placeholder="e.g. DevOps Engineer"
                />
              </label>

              <label>
                Status
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                >
                  {statuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>

              <label>
                Job URL
                <input
                  type="url"
                  value={form.job_url}
                  onChange={(e) =>
                    setForm({ ...form, job_url: e.target.value })
                  }
                  placeholder="https://..."
                />
              </label>
            </div>

            <label>
              Notes
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm({ ...form, notes: e.target.value })
                }
                placeholder="Recruiter details, preparation notes..."
              />
            </label>

            <div className="form-actions">
              <button type="button" className="secondary-btn"
                onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button className="primary-btn" type="submit">
                Save application
              </button>
            </div>
          </form>
        )}

        <section className="stats-grid">
          <StatCard label="Total applications" value={stats.total_applications ?? 0} icon="▤" tone="blue" />
          <StatCard label="Interviews" value={stats.interviews ?? 0} icon="◷" tone="purple" />
          <StatCard label="Offers received" value={stats.offers ?? 0} icon="✧" tone="green" />
          <StatCard label="Offer conversion" value={`${offerRate}%`} icon="↗" tone="orange" />
        </section>

        <section className="table-panel">
          <div className="table-heading">
            <div>
              <h2>Job applications</h2>
              <p>Your opportunities in one place</p>
            </div>
            <span className="count-badge">{applications.length} records</span>
          </div>

          <div className="filters">
            {["All", ...statuses].map((status) => (
              <button
                key={status}
                className={`filter-btn ${filter === status ? "selected" : ""}`}
                onClick={() => setFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="empty-state">Loading applications...</p>
          ) : filteredApplications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">▤</div>
              <h3>No applications found</h3>
              <p>Add your first job application to start tracking your journey.</p>
              <button className="primary-btn" onClick={() => setShowForm(true)}>
                + Add your first application
              </button>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>COMPANY / ROLE</th>
                    <th>DATE APPLIED</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <strong>{app.company}</strong>
                        <small>{app.role}</small>
                      </td>
                      <td>{app.application_date}</td>
                      <td>
                        <select
                          className={`status-select status-${app.status.toLowerCase()}`}
                          value={app.status}
                          onChange={(e) => updateStatus(app.id, e.target.value)}
                        >
                          {statuses.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button className="delete-btn"
                          onClick={() => deleteApplication(app.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer>PathPilot · Cloud-Native Placement Tracker · Built with React & Flask</footer>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <p>{label}</p>
      <h2>{value}</h2>
    </div>
  );
}

export default App;

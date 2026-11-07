import { useEffect, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api/v1";

const STATUSES = [
  "Applied",
  "Assessment",
  "Interview",
  "Offered",
  "Rejected",
  "Withdrawn",
];

const EMPTY_FORM = {
  company: "",
  role: "",
  status: "Applied",
  job_url: "",
  notes: "",
};

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("All");
  const [form, setForm] = useState(EMPTY_FORM);

  async function loadData() {
    try {
      setError("");
      const response = await fetch(`${API}/applications`);

      if (!response.ok) {
        throw new Error("Could not load applications.");
      }

      const apps = await response.json();
      setApplications(apps);
    } catch {
      setError("Cannot connect to Flask. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  // Initial data loading
  useEffect(() => {
    let ignore = false;

    async function fetchInitialApplications() {
      try {
        const response = await fetch(`${API}/applications`);

        if (!response.ok) {
          throw new Error("Could not load applications.");
        }

        const apps = await response.json();

        if (!ignore) {
          setApplications(apps);
          setError("");
        }
      } catch {
        if (!ignore) {
          setError("Cannot connect to Flask. Check that the backend is running.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchInitialApplications();

    return () => {
      ignore = true;
    };
  }, []);

  // Add application
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

      setForm(EMPTY_FORM);
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  // Update application status
  async function updateStatus(id, status) {
    try {
      const response = await fetch(`${API}/applications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Could not update status.");
      }

      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  // Delete application
  async function deleteApplication(id) {
    if (!window.confirm("Delete this job application?")) return;

    try {
      const response = await fetch(`${API}/applications/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Could not delete application.");
      }

      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  // Dashboard calculations
  const total = applications.length;

  const interviews = applications.filter(
    (app) => app.status === "Interview"
  );

  const offers = applications.filter(
    (app) => app.status === "Offered"
  );

  const offerRate = total
    ? Math.round((offers.length / total) * 100)
    : 0;

  const filteredApplications =
    filter === "All"
      ? applications
      : applications.filter((app) => app.status === filter);

  const counts = STATUSES.map((status) => ({
    status,
    count: applications.filter((app) => app.status === status).length,
  }));

  // Navigation
  function openPage(page) {
    setActivePage(page);
    setShowForm(false);
    setError("");
  }

  // Application form
  function ApplicationForm() {
    return (
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
              {STATUSES.map((status) => (
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
          <button
            type="button"
            className="secondary-btn"
            onClick={() => setShowForm(false)}
          >
            Cancel
          </button>

          <button className="primary-btn" type="submit">
            Save application
          </button>
        </div>
      </form>
    );
  }

  // Applications table
  function ApplicationTable({ records }) {
    return (
      <section className="table-panel">
        <div className="table-heading">
          <div>
            <h2>Job applications</h2>
            <p>Your opportunities in one place</p>
          </div>

          <span className="count-badge">
            {records.length} records
          </span>
        </div>

        {records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">[ ]</div>
            <h3>No applications found</h3>
            <p>Add a job application to start tracking your journey.</p>

            <button
              className="primary-btn"
              onClick={() => setShowForm(true)}
            >
              + Add application
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
                {records.map((app) => (
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
                        onChange={(e) =>
                          updateStatus(app.id, e.target.value)
                        }
                      >
                        {STATUSES.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => deleteApplication(app.id)}
                      >
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
    );
  }

  // Page header
  function PageHeader({ title, description }) {
    return (
      <header className="topbar">
        <div>
          <span className="eyebrow">YOUR CAREER, ORGANIZED</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>

        <button
          className="primary-btn"
          onClick={() => setShowForm(!showForm)}
        >
          + Add application
        </button>
      </header>
    );
  }

  // Dashboard page
  function renderDashboard() {
    return (
      <>
        <PageHeader
          title="Placement Dashboard"
          description="Track applications. Prepare for interviews. Land your next role."
        />

        {showForm && <ApplicationForm />}

        <section className="stats-grid">
          <StatCard
            label="Total applications"
            value={total}
            icon="APP"
            tone="blue"
          />

          <StatCard
            label="Interviews"
            value={interviews.length}
            icon="INT"
            tone="purple"
          />

          <StatCard
            label="Offers received"
            value={offers.length}
            icon="OFF"
            tone="green"
          />

          <StatCard
            label="Offer conversion"
            value={`${offerRate}%`}
            icon="RATE"
            tone="orange"
          />
        </section>

        <ApplicationTable records={applications.slice(0, 5)} />
      </>
    );
  }

  // Applications page
  function renderApplications() {
    return (
      <>
        <PageHeader
          title="Applications"
          description="Manage and track every job opportunity."
        />

        {showForm && <ApplicationForm />}

        <div className="filters">
          {["All", ...STATUSES].map((status) => (
            <button
              key={status}
              className={`filter-btn ${
                filter === status ? "selected" : ""
              }`}
              onClick={() => setFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="empty-state">Loading applications...</p>
        ) : (
          <ApplicationTable records={filteredApplications} />
        )}
      </>
    );
  }

  // Interviews page
  function renderInterviews() {
    return (
      <>
        <PageHeader
          title="Interviews"
          description="Track applications that have reached the interview stage."
        />

        <section className="stats-grid">
          <StatCard
            label="Interview-stage applications"
            value={interviews.length}
            icon="INT"
            tone="purple"
          />
        </section>

        <ApplicationTable records={interviews} />

        <p className="empty-state">
          Interview scheduling and reminders can be added through a dedicated
          backend feature in a future update.
        </p>
      </>
    );
  }

  // Analytics page
  function renderAnalytics() {
    const maxCount = Math.max(
      1,
      ...counts.map((item) => item.count)
    );

    return (
      <>
        <PageHeader
          title="Analytics"
          description="Understand your placement progress and application outcomes."
        />

        <section className="stats-grid">
          <StatCard
            label="Total applications"
            value={total}
            icon="APP"
            tone="blue"
          />

          <StatCard
            label="Interviews"
            value={interviews.length}
            icon="INT"
            tone="purple"
          />

          <StatCard
            label="Offers"
            value={offers.length}
            icon="OFF"
            tone="green"
          />

          <StatCard
            label="Offer conversion"
            value={`${offerRate}%`}
            icon="RATE"
            tone="orange"
          />
        </section>

        <section className="table-panel">
          <div className="table-heading">
            <div>
              <h2>Application status breakdown</h2>
              <p>Distribution of your current applications</p>
            </div>
          </div>

          {counts.map((item) => (
            <div key={item.status} style={{ margin: "18px 0" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "7px",
                }}
              >
                <strong>{item.status}</strong>
                <span>{item.count}</span>
              </div>

              <div
                style={{
                  height: "10px",
                  background: "#e8edf5",
                  borderRadius: "20px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${(item.count / maxCount) * 100}%`,
                    background: "#5268df",
                    borderRadius: "20px",
                  }}
                />
              </div>
            </div>
          ))}
        </section>
      </>
    );
  }

  const pageContent = {
    Dashboard: renderDashboard,
    Applications: renderApplications,
    Interviews: renderInterviews,
    Analytics: renderAnalytics,
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">P</span>
          <span>PathPilot</span>
        </div>

        <p className="nav-label">WORKSPACE</p>

        {["Dashboard", "Applications", "Interviews", "Analytics"].map(
          (page) => (
            <button
              key={page}
              type="button"
              className={
                activePage === page ? "nav-item active" : "nav-item"
              }
              onClick={() => openPage(page)}
            >
              {page}
            </button>
          )
        )}

        <div className="sidebar-footer">
          <div className="avatar">H</div>

          <div>
            <strong>My Workspace</strong>
            <small>Placement journey</small>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <p className="empty-state">Loading PathPilot...</p>
        ) : (
          pageContent[activePage]()
        )}

        <footer>
          PathPilot | Cloud-Native Placement Tracker | Built with React and Flask
        </footer>
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
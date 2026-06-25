/* ==========================================================================
   Jenkins Pipeline Masterclass - Dashboard Simulation
   Renders a realistic Jenkins Dashboard with live build queue, executors,
   job status, build history, and node information that updates dynamically
   ========================================================================== */

// ============================================================================
// Dashboard Data - Simulated Jenkins jobs and builds
// ============================================================================
const DASHBOARD_JOBS = [
    { name: 'payment-service-pipeline', weather: '☀️', status: 'success', lastBuild: '#142', duration: '4m 23s' },
    { name: 'customer-api-build', weather: '☀️', status: 'success', lastBuild: '#89', duration: '2m 15s' },
    { name: 'notification-service', weather: '🌤️', status: 'building', lastBuild: '#56', duration: 'Running...' },
    { name: 'transaction-processor', weather: '☀️', status: 'success', lastBuild: '#201', duration: '6m 45s' },
    { name: 'fraud-detection-ml', weather: '⛈️', status: 'failed', lastBuild: '#34', duration: '1m 02s' },
    { name: 'api-gateway-deploy', weather: '🌤️', status: 'unstable', lastBuild: '#78', duration: '3m 18s' },
    { name: 'database-migration', weather: '☀️', status: 'success', lastBuild: '#45', duration: '0m 52s' },
    { name: 'integration-tests', weather: '☀️', status: 'success', lastBuild: '#167', duration: '12m 03s' }
];

const DASHBOARD_QUEUE = [
    { job: 'notification-service #57', reason: 'Waiting for executor on build-node-02', time: '12s' },
    { job: 'customer-api-build #90', reason: 'Blocked by upstream: payment-service-pipeline', time: '5s' }
];

const DASHBOARD_EXECUTORS = [
    { node: 'Controller', executor: '#1', job: 'Idle', progress: 0 },
    { node: 'build-node-01', executor: '#1', job: 'payment-service #142', progress: 85 },
    { node: 'build-node-01', executor: '#2', job: 'transaction-processor #201', progress: 62 },
    { node: 'build-node-02', executor: '#1', job: 'notification-service #56', progress: 34 },
    { node: 'build-node-02', executor: '#2', job: 'integration-tests #167', progress: 91 },
    { node: 'build-node-03', executor: '#1', job: 'Idle', progress: 0 },
    { node: 'build-node-03', executor: '#2', job: 'Idle', progress: 0 }
];

const DASHBOARD_HISTORY = [
    { job: 'payment-service #142', status: 'success', time: '2 min ago' },
    { job: 'customer-api #89', status: 'success', time: '5 min ago' },
    { job: 'fraud-detection #34', status: 'failed', time: '8 min ago' },
    { job: 'api-gateway #78', status: 'unstable', time: '12 min ago' },
    { job: 'notification-svc #55', status: 'success', time: '15 min ago' },
    { job: 'transaction-proc #200', status: 'success', time: '18 min ago' },
    { job: 'database-migration #44', status: 'success', time: '22 min ago' },
    { job: 'integration-tests #166', status: 'success', time: '25 min ago' }
];

const DASHBOARD_NODES = [
    { name: 'Controller', status: 'online', executors: '0/2', arch: 'Linux x86_64' },
    { name: 'build-node-01', status: 'online', executors: '2/2 busy', arch: 'Linux x86_64' },
    { name: 'build-node-02', status: 'online', executors: '2/2 busy', arch: 'Linux x86_64' },
    { name: 'build-node-03', status: 'online', executors: '0/2', arch: 'Linux ARM64' },
    { name: 'docker-agent-01', status: 'offline', executors: '0/4', arch: 'Linux x86_64' }
];

// ============================================================================
// Dashboard Renderer Class
// ============================================================================
class JenkinsDashboard {
    constructor() {
        this.queueContainer = document.getElementById('build-queue');
        this.executorContainer = document.getElementById('executor-status');
        this.jobContainer = document.getElementById('job-list');
        this.historyContainer = document.getElementById('build-history');
        this.nodeContainer = document.getElementById('node-list');
        this.init();
    }

    init() {
        this.renderQueue();
        this.renderExecutors();
        this.renderJobs();
        this.renderHistory();
        this.renderNodes();
        // Start live updates to simulate real dashboard behavior
        this.startLiveUpdates();
    }

    // Render the build queue panel
    renderQueue() {
        if (!this.queueContainer) return;
        if (DASHBOARD_QUEUE.length === 0) {
            this.queueContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem;">No builds in queue</p>';
            return;
        }
        this.queueContainer.innerHTML = DASHBOARD_QUEUE.map(item => `
            <div class="queue-item">
                <span class="queue-icon"></span>
                <div>
                    <div style="font-weight: 600; margin-bottom: 2px;">${item.job}</div>
                    <div style="color: var(--text-muted); font-size: 0.7rem;">${item.reason}</div>
                </div>
                <span style="margin-left: auto; color: var(--accent-yellow); font-size: 0.7rem;">${item.time}</span>
            </div>
        `).join('');
    }

    // Render executor status panel with progress bars
    renderExecutors() {
        if (!this.executorContainer) return;
        this.executorContainer.innerHTML = DASHBOARD_EXECUTORS.map(exec => `
            <div class="executor-item">
                <span class="executor-label">${exec.node} ${exec.executor}</span>
                <div class="executor-progress">
                    <div class="executor-progress-bar" style="width: ${exec.progress}%"></div>
                </div>
                <span style="font-size: 0.7rem; color: ${exec.progress > 0 ? 'var(--accent-blue)' : 'var(--text-muted)'}; min-width: 60px; text-align: right;">
                    ${exec.progress > 0 ? exec.progress + '%' : 'Idle'}
                </span>
            </div>
        `).join('');
    }

    // Render the job list panel with status indicators
    renderJobs() {
        if (!this.jobContainer) return;
        this.jobContainer.innerHTML = DASHBOARD_JOBS.map(job => `
            <div class="job-item">
                <span class="job-weather">${job.weather}</span>
                <span class="job-status ${job.status}"></span>
                <span class="job-name">${job.name}</span>
                <span class="job-build-num">${job.lastBuild} | ${job.duration}</span>
            </div>
        `).join('');
    }

    // Render build history timeline
    renderHistory() {
        if (!this.historyContainer) return;
        this.historyContainer.innerHTML = DASHBOARD_HISTORY.map(item => `
            <div class="history-item">
                <span class="history-status" style="background: ${this.getStatusColor(item.status)}"></span>
                <span style="font-size: 0.8rem;">${item.job}</span>
                <span class="history-time">${item.time}</span>
            </div>
        `).join('');
    }

    // Render node list panel
    renderNodes() {
        if (!this.nodeContainer) return;
        this.nodeContainer.innerHTML = DASHBOARD_NODES.map(node => `
            <div class="node-item">
                <span class="node-status-dot ${node.status}"></span>
                <span class="node-name">${node.name}</span>
                <span class="node-info">${node.executors}</span>
            </div>
        `).join('');
    }

    // Get color based on build status
    getStatusColor(status) {
        switch (status) {
            case 'success': return 'var(--accent-green)';
            case 'failed': return 'var(--jenkins-red)';
            case 'unstable': return 'var(--accent-yellow)';
            case 'building': return 'var(--accent-blue)';
            default: return 'var(--text-muted)';
        }
    }

    // Simulate live dashboard updates - executor progress moves
    startLiveUpdates() {
        setInterval(() => {
            // Update executor progress bars to simulate active builds
            DASHBOARD_EXECUTORS.forEach(exec => {
                if (exec.progress > 0 && exec.progress < 100) {
                    exec.progress = Math.min(100, exec.progress + Math.random() * 3);
                    if (exec.progress >= 100) {
                        // Reset to simulate new build starting
                        setTimeout(() => {
                            exec.progress = Math.random() * 30;
                        }, 2000);
                    }
                }
            });
            this.renderExecutors();
        }, 3000);

        // Update queue wait times
        setInterval(() => {
            DASHBOARD_QUEUE.forEach(item => {
                const currentSec = parseInt(item.time);
                item.time = (currentSec + 3) + 's';
            });
            this.renderQueue();
        }, 3000);
    }
}

// ============================================================================
// Initialize Dashboard on DOM Load
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new JenkinsDashboard();
});

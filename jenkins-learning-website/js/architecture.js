/* ==========================================================================
   Jenkins Pipeline Masterclass - Architecture Interactive Diagram
   Renders the Jenkins Controller/Agent architecture with clickable nodes,
   animated connections, and detailed information panels
   ========================================================================== */

// ============================================================================
// Architecture Node Definitions
// ============================================================================
const ARCH_NODES = [
    {
        id: 'controller',
        label: 'Jenkins Controller',
        sublabel: 'Master Node',
        icon: '🎛️',
        x: 45,
        y: 8,
        info: {
            title: 'Jenkins Controller (Master)',
            description: 'The central brain of Jenkins. It manages the entire CI/CD ecosystem, scheduling jobs, dispatching builds to agents, and serving the web UI.',
            details: [
                'Hosts the Jenkins web UI and REST API',
                'Stores all job configurations and build history',
                'Manages plugin lifecycle and updates',
                'Schedules builds and assigns them to agents',
                'Handles authentication and authorization (RBAC)',
                'Maintains the build queue and executor pool',
                'Stores credentials securely (encrypted)',
                'Serves webhooks and triggers builds',
                'Manages distributed build coordination',
                'Persists data to $JENKINS_HOME directory'
            ]
        }
    },
    {
        id: 'agent-1',
        label: 'Agent Node 1',
        sublabel: 'Linux Worker',
        icon: '🐧',
        x: 15,
        y: 35,
        info: {
            title: 'Jenkins Agent (Worker Node)',
            description: 'A machine that connects to the Jenkins controller and executes build jobs. Agents provide the actual compute resources for running pipelines.',
            details: [
                'Connects to controller via JNLP or SSH',
                'Runs builds in isolated workspaces',
                'Can run multiple executors in parallel',
                'Labels define capabilities (linux, docker, java)',
                'Heartbeat keeps connection alive with controller',
                'Workspace is created per job execution',
                'Tools are provisioned based on job requirements',
                'Communicates via Jenkins Remoting protocol',
                'Can be static (always-on) or dynamic (cloud-provisioned)',
                'Reports executor status back to controller'
            ]
        }
    },
    {
        id: 'agent-2',
        label: 'Agent Node 2',
        sublabel: 'Docker Agent',
        icon: '🐳',
        x: 75,
        y: 35,
        info: {
            title: 'Docker Agent',
            description: 'An agent that runs builds inside Docker containers, providing clean, reproducible environments for each build.',
            details: [
                'Each build gets a fresh container environment',
                'Container image defines the build tools available',
                'Containers are destroyed after build completion',
                'Supports multi-container pods (Kubernetes)',
                'Dockerfile defines the agent environment',
                'Volumes mount workspace and caches',
                'Network isolation between build containers',
                'Resource limits (CPU/memory) per container',
                'Docker-in-Docker for building images',
                'Persistent volume claims for Maven/npm caches'
            ]
        }
    },
    {
        id: 'workspace',
        label: 'Workspace',
        sublabel: 'Build Directory',
        icon: '📁',
        x: 15,
        y: 60,
        info: {
            title: 'Jenkins Workspace',
            description: 'A directory on the agent where Jenkins checks out source code and executes build steps. Each job gets its own workspace.',
            details: [
                'Located at: $JENKINS_HOME/workspace/<job-name>',
                'Source code is checked out here from SCM',
                'Build artifacts are generated in this directory',
                'Workspace persists between builds (unless cleaned)',
                'Multiple executors use separate workspaces',
                'Environment variables are injected into workspace',
                'Temporary files and build outputs accumulate here',
                'cleanWs() step removes workspace after build',
                'Workspace can be shared between pipeline stages',
                'Stash/unstash moves files between nodes'
            ]
        }
    },
    {
        id: 'executors',
        label: 'Executors',
        sublabel: 'Build Slots',
        icon: '⚡',
        x: 75,
        y: 60,
        info: {
            title: 'Jenkins Executors',
            description: 'Execution slots on a node that can run one build at a time. Each node has a configurable number of executors determining parallelism.',
            details: [
                'Each executor runs one build at a time',
                'Default: 2 executors per node',
                'Controller can have 0 executors (recommended for production)',
                'More executors = more parallel builds',
                'Executor count depends on node resources (CPU/RAM)',
                'Idle executors wait for builds from the queue',
                'Busy executors report progress to controller',
                'Executor is locked to a build until completion',
                'Build queue holds jobs waiting for free executors',
                'Lightweight executors for Pipeline flyweight steps'
            ]
        }
    },
    {
        id: 'plugins',
        label: 'Plugins',
        sublabel: '1800+ Available',
        icon: '🧩',
        x: 45,
        y: 85,
        info: {
            title: 'Jenkins Plugins',
            description: 'Extensions that add functionality to Jenkins. The plugin ecosystem is what makes Jenkins extremely flexible and powerful.',
            details: [
                'Over 1800 plugins available in the Jenkins Update Center',
                'Git Plugin: SCM integration with Git repositories',
                'Pipeline Plugin: Enables Jenkinsfile-based pipelines',
                'Docker Plugin: Run builds in Docker containers',
                'Kubernetes Plugin: Dynamic pod-based agents',
                'Credentials Plugin: Secure credential storage',
                'Blue Ocean: Modern pipeline visualization UI',
                'SonarQube Plugin: Code quality analysis integration',
                'Slack/Email: Build notification plugins',
                'Plugins can be managed via UI, CLI, or Configuration as Code'
            ]
        }
    },
    {
        id: 'credentials',
        label: 'Credentials',
        sublabel: 'Secrets Store',
        icon: '🔐',
        x: 10,
        y: 85,
        info: {
            title: 'Jenkins Credentials Store',
            description: 'Secure storage for sensitive data like passwords, SSH keys, API tokens, and certificates used during builds.',
            details: [
                'Encrypted at rest using Jenkins master key',
                'Types: Username/Password, SSH Key, Secret Text, Certificate',
                'Scoped: Global, System, or Folder-level',
                'Injected into builds via withCredentials() step',
                'Never exposed in console output (masked)',
                'Supports external credential providers (HashiCorp Vault)',
                'Credentials binding plugin for environment variables',
                'Audited: access logged in Jenkins audit trail',
                'Can be managed via Jenkins Configuration as Code',
                'Domain-specific credentials for different systems'
            ]
        }
    },
    {
        id: 'pipeline',
        label: 'Pipeline Engine',
        sublabel: 'Groovy DSL',
        icon: '🔄',
        x: 80,
        y: 85,
        info: {
            title: 'Jenkins Pipeline Engine',
            description: 'The core engine that executes Jenkinsfile pipelines. Supports both Declarative and Scripted syntax using Groovy DSL.',
            details: [
                'Declarative: Structured, opinionated syntax with pipeline {}',
                'Scripted: Full Groovy power with node {} and stage {}',
                'Jenkinsfile: Pipeline definition stored in SCM',
                'Stages: Logical groupings of steps in a pipeline',
                'Steps: Individual tasks (sh, echo, junit, etc.)',
                'Parallel: Run stages concurrently for speed',
                'Input: Human approval gates in pipelines',
                'Shared Libraries: Reusable pipeline code across projects',
                'Checkpoint/Restart: Resume failed pipelines',
                'Pipeline as Code: Version-controlled CI/CD definitions'
            ]
        }
    }
];

// Architecture connections between nodes (from -> to)
const ARCH_CONNECTIONS = [
    { from: 'controller', to: 'agent-1', label: 'JNLP/SSH' },
    { from: 'controller', to: 'agent-2', label: 'Remoting' },
    { from: 'agent-1', to: 'workspace', label: 'Creates' },
    { from: 'agent-2', to: 'executors', label: 'Manages' },
    { from: 'controller', to: 'plugins', label: 'Loads' },
    { from: 'controller', to: 'credentials', label: 'Stores' },
    { from: 'controller', to: 'pipeline', label: 'Executes' }
];

// ============================================================================
// Architecture Diagram Renderer
// ============================================================================
class ArchitectureDiagram {
    constructor() {
        this.container = document.getElementById('arch-diagram');
        this.detailsPanel = document.getElementById('arch-details');
        this.activeNode = null;
        this.init();
    }

    init() {
        if (!this.container) return;
        this.render();
        this.animateConnections();
    }

    // Render all architecture nodes and SVG connections
    render() {
        // Create SVG layer for connection lines
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '0';
        this.container.appendChild(svg);
        this.svg = svg;

        // Render each node
        ARCH_NODES.forEach(node => {
            const el = document.createElement('div');
            el.className = 'arch-node';
            el.setAttribute('data-node-id', node.id);
            el.style.left = node.x + '%';
            el.style.top = node.y + '%';
            el.style.transform = 'translate(-50%, -50%)';
            el.innerHTML = `
                <div class="arch-node-icon">${node.icon}</div>
                <div class="arch-node-label">${node.label}</div>
                <div class="arch-node-sublabel">${node.sublabel}</div>
            `;
            el.addEventListener('click', () => this.selectNode(node));
            this.container.appendChild(el);
        });

        // Draw connections after nodes are rendered
        // Use requestAnimationFrame to ensure DOM positions are calculated
        requestAnimationFrame(() => this.drawConnections());
    }

    // Draw SVG lines between connected nodes
    drawConnections() {
        const containerRect = this.container.getBoundingClientRect();

        ARCH_CONNECTIONS.forEach(conn => {
            const fromEl = this.container.querySelector(`[data-node-id="${conn.from}"]`);
            const toEl = this.container.querySelector(`[data-node-id="${conn.to}"]`);
            if (!fromEl || !toEl) return;

            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();

            // Calculate center positions relative to container
            const x1 = fromRect.left + fromRect.width / 2 - containerRect.left;
            const y1 = fromRect.top + fromRect.height / 2 - containerRect.top;
            const x2 = toRect.left + toRect.width / 2 - containerRect.left;
            const y2 = toRect.top + toRect.height / 2 - containerRect.top;

            // Create animated line
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('stroke', 'rgba(211, 56, 51, 0.3)');
            line.setAttribute('stroke-width', '1.5');
            line.classList.add('data-flow');
            this.svg.appendChild(line);
        });
    }

    // Handle node selection - show info panel
    selectNode(node) {
        // Update active state
        const allNodes = this.container.querySelectorAll('.arch-node');
        allNodes.forEach(n => n.classList.remove('active'));
        const activeEl = this.container.querySelector(`[data-node-id="${node.id}"]`);
        if (activeEl) activeEl.classList.add('active');

        // Update details panel
        this.detailsPanel.innerHTML = `
            <div class="arch-info glass-card">
                <h3>${node.info.title}</h3>
                <p>${node.info.description}</p>
                <h4 style="margin-top: 16px; font-size: 0.9rem; color: var(--text-primary);">Key Details:</h4>
                <ul>
                    ${node.info.details.map(d => `<li>${d}</li>`).join('')}
                </ul>
            </div>
        `;

        this.activeNode = node.id;
    }

    // Animate the connection lines with a pulsing effect
    animateConnections() {
        // Connections already animate via CSS data-flow class
        // Add periodic highlight to show data flowing
        setInterval(() => {
            const lines = this.svg ? this.svg.querySelectorAll('line') : [];
            lines.forEach((line, i) => {
                setTimeout(() => {
                    line.setAttribute('stroke', 'rgba(211, 56, 51, 0.6)');
                    setTimeout(() => {
                        line.setAttribute('stroke', 'rgba(211, 56, 51, 0.3)');
                    }, 500);
                }, i * 200);
            });
        }, 5000);
    }
}

// ============================================================================
// Initialize Architecture on DOM Load
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const archDiagram = new ArchitectureDiagram();
});

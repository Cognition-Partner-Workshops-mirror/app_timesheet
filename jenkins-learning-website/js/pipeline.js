/* ==========================================================================
   Jenkins Pipeline Masterclass - Interactive Pipeline Visualization
   Handles: Pipeline stages rendering, animation, play/pause/step controls,
   console output simulation, and stage click interactions
   ========================================================================== */

// ============================================================================
// Pipeline Stage Definitions - Each stage of the CI/CD pipeline
// ============================================================================
const PIPELINE_STAGES = [
    {
        id: 'developer',
        label: 'Developer',
        icon: '👨‍💻',
        color: '#A78BFA',
        consoleLines: [
            '[Developer] Code changes committed locally',
            '[Developer] Running pre-commit hooks...',
            '[Developer] All checks passed',
            '[Developer] Pushing to remote repository...',
            '[Git] Compressing objects: 100% (12/12), done.',
            '[Git] Writing objects: 100% (15/15), 3.42 KiB, done.',
            '[Git] Total 15 (delta 8), reused 0 (delta 0)',
            '[Git] remote: Resolving deltas: 100% (8/8), completed.'
        ]
    },
    {
        id: 'git-push',
        label: 'Git Push',
        icon: '📤',
        color: '#F472B6',
        consoleLines: [
            '[Git] To https://github.com/bank/payment-service.git',
            '[Git]    a1b2c3d..e4f5g6h  feature/upi-payment -> feature/upi-payment',
            '[Git] Branch \'feature/upi-payment\' set up to track remote branch.',
            '[Git] POST /repos/bank/payment-service/git/refs 201 Created',
            '[Git] SHA: e4f5g6h8i9j0k1l2m3n4o5p6q7r8s9t0'
        ]
    },
    {
        id: 'webhook',
        label: 'Webhook',
        icon: '🔔',
        color: '#FB923C',
        consoleLines: [
            '[GitHub] Webhook triggered: push event',
            '[GitHub] POST http://jenkins.bank.internal:8080/github-webhook/',
            '[GitHub] Headers: X-GitHub-Event: push',
            '[GitHub] Payload: {"ref":"refs/heads/feature/upi-payment","repository":{"full_name":"bank/payment-service"}}',
            '[GitHub] Response: 200 OK',
            '[GitHub] Delivery ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890'
        ]
    },
    {
        id: 'trigger',
        label: 'Jenkins Trigger',
        icon: '⚡',
        color: '#FBBF24',
        consoleLines: [
            '[Jenkins] Received webhook from GitHub',
            '[Jenkins] Authenticating webhook signature... OK',
            '[Jenkins] Matching job: payment-service-pipeline',
            '[Jenkins] Branch filter matches: feature/upi-payment',
            '[Jenkins] Triggering build #142',
            '[Jenkins] Build queued in the build queue.'
        ]
    },
    {
        id: 'queue',
        label: 'Queue',
        icon: '📋',
        color: '#60A5FA',
        consoleLines: [
            '[Queue] Build #142 entered the build queue',
            '[Queue] Waiting for next available executor...',
            '[Queue] Queue position: 1',
            '[Queue] Checking agent availability...',
            '[Queue] Agent "build-node-03" is available',
            '[Queue] Executor #2 on build-node-03 is idle',
            '[Queue] Build #142 leaving queue after 2.3s'
        ]
    },
    {
        id: 'executor',
        label: 'Executor',
        icon: '⚙️',
        color: '#22D3EE',
        consoleLines: [
            '[Executor] Assigned to: build-node-03, Executor #2',
            '[Executor] Loading pipeline definition...',
            '[Executor] Parsing Jenkinsfile...',
            '[Executor] Pipeline stages: 11 stages detected',
            '[Executor] Loading required plugins...',
            '[Executor] kubernetes-plugin: loaded',
            '[Executor] git-plugin: loaded',
            '[Executor] credentials-plugin: loaded'
        ]
    },
    {
        id: 'agent',
        label: 'Agent Alloc',
        icon: '🖥️',
        color: '#34D399',
        consoleLines: [
            '[Agent] Provisioning Kubernetes pod...',
            '[Agent] Pod template: maven + docker containers',
            '[Agent] Pod "jenkins-agent-payment-142-xyz" created',
            '[Agent] Waiting for pod to be ready...',
            '[Agent] Container "maven": Running',
            '[Agent] Container "docker": Running',
            '[Agent] Pod ready in 8.2 seconds',
            '[Agent] Injecting credentials...',
            '[Agent] Environment variables loaded: 14 vars'
        ]
    },
    {
        id: 'workspace',
        label: 'Workspace',
        icon: '📁',
        color: '#A78BFA',
        consoleLines: [
            '[Workspace] Creating workspace: /home/jenkins/workspace/payment-service-pipeline',
            '[Workspace] Cleaning previous workspace...',
            '[Workspace] rm -rf /home/jenkins/workspace/payment-service-pipeline/*',
            '[Workspace] Workspace cleaned.',
            '[Workspace] Setting up environment...',
            '[Workspace] JAVA_HOME=/usr/lib/jvm/java-17-openjdk',
            '[Workspace] M2_HOME=/usr/share/maven',
            '[Workspace] PATH updated with tool locations'
        ]
    },
    {
        id: 'checkout',
        label: 'SCM Checkout',
        icon: '📥',
        color: '#60A5FA',
        consoleLines: [
            '[Pipeline] stage(\'Checkout\')',
            '[Git] Using credentials github-token',
            '[Git] Cloning repository https://github.com/bank/payment-service.git',
            '[Git] Fetching upstream changes from origin',
            '[Git] Checking out Revision e4f5g6h8 (feature/upi-payment)',
            '[Git] Commit message: "feat: add UPI transaction validation"',
            '[Git] > git rev-parse HEAD => e4f5g6h8i9j0k1l2m3n4o5p6q7r8s9t0',
            '[Pipeline] Checkout complete. 847 files in workspace.'
        ]
    },
    {
        id: 'build',
        label: 'Build',
        icon: '🔨',
        color: '#FB923C',
        consoleLines: [
            '[Pipeline] stage(\'Build\')',
            '[Maven] $ mvn clean compile -DskipTests',
            '[Maven] Scanning for projects...',
            '[Maven] Building payment-service 2.4.1-SNAPSHOT',
            '[Maven] Downloading dependencies... (43 artifacts)',
            '[Maven] [INFO] --- maven-compiler-plugin:3.11.0:compile ---',
            '[Maven] [INFO] Compiling 127 source files to /target/classes',
            '[Maven] [INFO] BUILD SUCCESS',
            '[Maven] [INFO] Total time: 34.218s',
            '[Maven] [INFO] Finished at: 2024-01-15T10:23:45Z'
        ]
    },
    {
        id: 'test',
        label: 'Unit Test',
        icon: '🧪',
        color: '#34D399',
        consoleLines: [
            '[Pipeline] stage(\'Unit Tests\')',
            '[Maven] $ mvn test',
            '[JUnit] Running com.bank.payment.UpiTransactionTest',
            '[JUnit] Tests run: 24, Failures: 0, Errors: 0, Skipped: 0',
            '[JUnit] Running com.bank.payment.CustomerApiTest',
            '[JUnit] Tests run: 18, Failures: 0, Errors: 0, Skipped: 0',
            '[JUnit] Running com.bank.payment.SecurityTest',
            '[JUnit] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0',
            '[JUnit] Total: 54 tests, 54 passed, 0 failed',
            '[JaCoCo] Code Coverage: 87.3% (minimum: 80%)',
            '[Pipeline] junit: Recording test results'
        ]
    },
    {
        id: 'sonar',
        label: 'SonarQube',
        icon: '🔍',
        color: '#22D3EE',
        consoleLines: [
            '[Pipeline] stage(\'SonarQube Analysis\')',
            '[SonarQube] Preparing analysis...',
            '[SonarQube] Server: https://sonar.bank.internal',
            '[SonarQube] Project: payment-service',
            '[SonarQube] Scanning 127 source files...',
            '[SonarQube] Analyzing Java code...',
            '[SonarQube] Bugs: 0 | Vulnerabilities: 0 | Code Smells: 3',
            '[SonarQube] Security Hotspots: 0',
            '[SonarQube] Coverage: 87.3% | Duplications: 1.2%',
            '[SonarQube] Analysis complete. Report uploaded.'
        ]
    },
    {
        id: 'quality-gate',
        label: 'Quality Gate',
        icon: '✅',
        color: '#34D399',
        consoleLines: [
            '[Pipeline] stage(\'Quality Gate\')',
            '[SonarQube] Waiting for Quality Gate result...',
            '[SonarQube] Checking status...',
            '[SonarQube] Quality Gate: PASSED',
            '[SonarQube] ✓ Coverage > 80% (actual: 87.3%)',
            '[SonarQube] ✓ Bugs = 0',
            '[SonarQube] ✓ Vulnerabilities = 0',
            '[SonarQube] ✓ Duplications < 3% (actual: 1.2%)',
            '[Pipeline] Quality Gate passed. Proceeding...'
        ]
    },
    {
        id: 'package',
        label: 'Package',
        icon: '📦',
        color: '#FBBF24',
        consoleLines: [
            '[Pipeline] stage(\'Package\')',
            '[Maven] $ mvn package -DskipTests',
            '[Maven] Building jar: target/payment-service-2.4.1-SNAPSHOT.jar',
            '[Maven] Including dependencies...',
            '[Maven] Generating MANIFEST.MF...',
            '[Maven] [INFO] BUILD SUCCESS',
            '[Pipeline] archiveArtifacts: Archiving target/*.jar',
            '[Pipeline] fingerprint: Recording fingerprint of payment-service-2.4.1-SNAPSHOT.jar',
            '[Pipeline] Artifact: payment-service-2.4.1-SNAPSHOT.jar (42.3 MB)'
        ]
    },
    {
        id: 'docker',
        label: 'Docker Build',
        icon: '🐳',
        color: '#60A5FA',
        consoleLines: [
            '[Pipeline] stage(\'Docker Build & Push\')',
            '[Docker] Building image: registry.bank.internal/payment-service:e4f5g6h',
            '[Docker] Step 1/8: FROM eclipse-temurin:17-jre-alpine',
            '[Docker] Step 2/8: WORKDIR /app',
            '[Docker] Step 3/8: COPY target/*.jar app.jar',
            '[Docker] Step 4/8: EXPOSE 8080',
            '[Docker] Step 5/8: HEALTHCHECK --interval=30s CMD curl -f http://localhost:8080/actuator/health',
            '[Docker] Successfully built abc123def456',
            '[Docker] Pushing to registry.bank.internal...',
            '[Docker] e4f5g6h: pushed',
            '[Docker] latest: pushed',
            '[Docker] Image pushed successfully.'
        ]
    },
    {
        id: 'deploy',
        label: 'Deploy',
        icon: '🚀',
        color: '#EF5350',
        consoleLines: [
            '[Pipeline] stage(\'Deploy to Staging\')',
            '[Kubernetes] Applying manifests from k8s/staging/',
            '[Kubernetes] deployment.apps/payment-service configured',
            '[Kubernetes] service/payment-service unchanged',
            '[Kubernetes] Waiting for rollout to complete...',
            '[Kubernetes] deployment "payment-service" successfully rolled out',
            '[Kubernetes] 3/3 replicas available',
            '[Pipeline] Staging deployment complete in 45s'
        ]
    },
    {
        id: 'health-check',
        label: 'Health Check',
        icon: '💚',
        color: '#34D399',
        consoleLines: [
            '[Pipeline] stage(\'Health Check\')',
            '[HTTP] GET http://payment-service.payments-staging.svc/actuator/health',
            '[HTTP] Response: 200 OK',
            '[HTTP] Body: {"status":"UP","components":{"db":{"status":"UP"},"kafka":{"status":"UP"},"redis":{"status":"UP"}}}',
            '[Pipeline] All health checks passed!',
            '[Slack] Sending notification to #deployments...',
            '[Slack] Message sent: "SUCCESS: payment-service ve4f5g6h deployed"',
            '[Pipeline] Pipeline completed: SUCCESS',
            '[Pipeline] Total time: 4 min 23 sec'
        ]
    }
];

// ============================================================================
// Pipeline Visualization Class
// ============================================================================
class PipelineVisualization {
    constructor() {
        this.stagesContainer = document.getElementById('pipeline-stages');
        this.consoleBody = document.getElementById('console-body');
        this.currentStage = -1;
        this.isPlaying = false;
        this.isPaused = false;
        this.speed = 3;
        this.animationTimer = null;
        this.lineTimer = null;
        this.init();
    }

    init() {
        this.renderStages();
        this.bindControls();
        this.bindSpeedControl();
    }

    // Render all pipeline stages with connectors between them
    renderStages() {
        this.stagesContainer.innerHTML = '';
        PIPELINE_STAGES.forEach((stage, index) => {
            // Create stage node
            const stageEl = document.createElement('div');
            stageEl.className = 'pipeline-stage waiting';
            stageEl.setAttribute('data-stage-id', stage.id);
            stageEl.setAttribute('data-index', index);
            stageEl.innerHTML = `
                <div class="pipeline-stage-node" style="--stage-color: ${stage.color}">
                    <span>${stage.icon}</span>
                </div>
                <span class="pipeline-stage-label">${stage.label}</span>
            `;
            // Click handler to open stage detail modal
            stageEl.addEventListener('click', () => {
                openStageModal(stage.id);
            });
            this.stagesContainer.appendChild(stageEl);

            // Add connector between stages (except after last)
            if (index < PIPELINE_STAGES.length - 1) {
                const connector = document.createElement('div');
                connector.className = 'pipeline-connector';
                connector.setAttribute('data-connector-index', index);
                this.stagesContainer.appendChild(connector);
            }
        });
    }

    // Bind play/pause/reset/step control buttons
    bindControls() {
        document.getElementById('pipeline-play').addEventListener('click', () => this.play());
        document.getElementById('pipeline-pause').addEventListener('click', () => this.pause());
        document.getElementById('pipeline-reset').addEventListener('click', () => this.reset());
        document.getElementById('pipeline-step').addEventListener('click', () => this.step());
    }

    // Bind speed range control
    bindSpeedControl() {
        const speedRange = document.getElementById('pipeline-speed-range');
        const speedLabel = document.getElementById('speed-label');
        speedRange.addEventListener('input', (e) => {
            this.speed = parseInt(e.target.value);
            speedLabel.textContent = this.speed + 'x';
        });
    }

    // Play the entire pipeline animation
    play() {
        if (this.isPlaying && !this.isPaused) return;
        
        if (this.isPaused) {
            // Resume from pause
            this.isPaused = false;
            this.advanceStage();
            return;
        }

        this.isPlaying = true;
        this.isPaused = false;
        this.currentStage = -1;
        this.clearConsole();
        this.resetStages();
        this.advanceStage();
    }

    // Pause the animation
    pause() {
        this.isPaused = true;
        if (this.animationTimer) clearTimeout(this.animationTimer);
        if (this.lineTimer) clearTimeout(this.lineTimer);
    }

    // Reset pipeline to initial state
    reset() {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentStage = -1;
        if (this.animationTimer) clearTimeout(this.animationTimer);
        if (this.lineTimer) clearTimeout(this.lineTimer);
        this.resetStages();
        this.clearConsole();
        this.addConsoleLine('[Pipeline]', 'Waiting for pipeline to start...');
    }

    // Step through one stage at a time
    step() {
        if (this.currentStage >= PIPELINE_STAGES.length - 1) {
            this.reset();
            return;
        }
        this.isPlaying = false;
        this.isPaused = false;
        this.currentStage++;
        this.animateStage(this.currentStage, false);
    }

    // Advance to the next pipeline stage
    advanceStage() {
        if (this.isPaused || !this.isPlaying) return;
        
        this.currentStage++;
        if (this.currentStage >= PIPELINE_STAGES.length) {
            // Pipeline complete
            this.isPlaying = false;
            this.addConsoleLine('[Pipeline]', 'Pipeline completed successfully! ✓', 'success');
            return;
        }

        this.animateStage(this.currentStage, true);
    }

    // Animate a single stage: mark running, output console lines, then mark success
    animateStage(index, autoAdvance) {
        const stage = PIPELINE_STAGES[index];
        const stageEl = this.stagesContainer.querySelector(`[data-index="${index}"]`);
        
        // Mark as running
        stageEl.className = 'pipeline-stage running';

        // Activate previous connector
        if (index > 0) {
            const connector = this.stagesContainer.querySelector(`[data-connector-index="${index - 1}"]`);
            if (connector) {
                connector.classList.add('active');
                // Add data packet animation
                connector.innerHTML = '<div class="data-packet"></div>';
            }
        }

        // Output console lines one by one
        const baseDelay = 800 / this.speed;
        let lineIndex = 0;

        const outputLine = () => {
            if (this.isPaused) return;
            if (lineIndex >= stage.consoleLines.length) {
                // Stage complete
                stageEl.className = 'pipeline-stage success';
                // Remove data packet from connector
                if (index > 0) {
                    const connector = this.stagesContainer.querySelector(`[data-connector-index="${index - 1}"]`);
                    if (connector) connector.innerHTML = '';
                }
                if (autoAdvance) {
                    this.animationTimer = setTimeout(() => this.advanceStage(), baseDelay);
                }
                return;
            }

            const line = stage.consoleLines[lineIndex];
            this.addConsoleLine('', line);
            lineIndex++;
            this.lineTimer = setTimeout(outputLine, baseDelay);
        };

        // Start outputting lines after brief delay
        this.lineTimer = setTimeout(outputLine, baseDelay / 2);
    }

    // Reset all stage visual states to waiting
    resetStages() {
        const stages = this.stagesContainer.querySelectorAll('.pipeline-stage');
        stages.forEach(s => s.className = 'pipeline-stage waiting');
        
        const connectors = this.stagesContainer.querySelectorAll('.pipeline-connector');
        connectors.forEach(c => {
            c.classList.remove('active');
            c.innerHTML = '';
        });
    }

    // Add a line to the console output
    addConsoleLine(prefix, text, type) {
        const line = document.createElement('p');
        line.className = 'console-line';
        if (type === 'error') line.classList.add('console-error');
        if (type === 'warning') line.classList.add('console-warning');
        
        let html = '';
        if (prefix) {
            html += `<span class="console-timestamp">${prefix}</span>`;
        }
        html += text;
        line.innerHTML = html;
        
        this.consoleBody.appendChild(line);
        // Auto-scroll to bottom
        this.consoleBody.scrollTop = this.consoleBody.scrollHeight;
    }

    // Clear all console output
    clearConsole() {
        this.consoleBody.innerHTML = '';
    }
}

// ============================================================================
// Initialize Pipeline on DOM Load
// ============================================================================
let pipelineViz = null;

document.addEventListener('DOMContentLoaded', () => {
    pipelineViz = new PipelineVisualization();
});

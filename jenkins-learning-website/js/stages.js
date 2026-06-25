/* ==========================================================================
   Jenkins Pipeline Masterclass - Stage Detail Modules
   Each pipeline stage becomes an interactive learning module with:
   - Animated visualization
   - Detailed explanation of Jenkins internals
   - Pipeline syntax examples
   - Common failures and debugging tips
   - Interview questions
   ========================================================================== */

// ============================================================================
// Stage Learning Content - Comprehensive details for each pipeline stage
// ============================================================================
const STAGE_CONTENT = {
    'developer': {
        title: 'Developer Pushes Code',
        icon: '👨‍💻',
        animation: 'code-push',
        sections: [
            {
                heading: 'What Happens',
                content: `When a developer pushes code, Git compresses objects, generates SHA hashes, 
                and transmits packfiles to the remote repository. This is the trigger point for the entire CI/CD pipeline.`
            },
            {
                heading: 'Internal Workflow',
                content: `<ul>
                    <li>Developer makes code changes and stages files (git add)</li>
                    <li>Git creates blob objects for each changed file</li>
                    <li>A tree object maps file names to blobs</li>
                    <li>Commit object created with SHA-1 hash, author, message, parent</li>
                    <li>Branch ref (HEAD) updated to point to new commit</li>
                    <li>git push compresses objects into a packfile</li>
                    <li>Packfile transmitted to remote via HTTPS or SSH</li>
                    <li>Remote updates its refs to include new commits</li>
                    <li>Server-side hooks execute (post-receive)</li>
                    <li>Webhook payload generated and dispatched to Jenkins</li>
                </ul>`
            },
            {
                heading: 'Jenkins Relevance',
                content: `Jenkins doesn't directly participate in the git push — but it's the event that starts everything. 
                Jenkins listens for push events via webhooks or polls the repository at intervals (Poll SCM).`
            },
            {
                heading: 'Pipeline Syntax',
                content: `<pre>// Jenkins detects the push via webhook or SCM polling
// Trigger configuration in Jenkinsfile:
pipeline {
    triggers {
        // Option 1: GitHub webhook (recommended)
        githubPush()
        
        // Option 2: Poll SCM every 5 minutes
        pollSCM('H/5 * * * *')
    }
}</pre>`
            },
            {
                heading: 'Common Failures',
                content: `<ul>
                    <li><strong>Authentication failure:</strong> SSH key expired or token revoked</li>
                    <li><strong>Branch protection:</strong> Push rejected by branch rules</li>
                    <li><strong>Large files:</strong> Git LFS not configured for binary files</li>
                    <li><strong>Force push:</strong> History rewrite can confuse Jenkins branch indexing</li>
                </ul>`
            },
            {
                heading: 'Interview Questions',
                content: `<ul>
                    <li>Q: How does Jenkins know when code is pushed?<br>
                    A: Via webhooks (GitHub/GitLab sends POST to Jenkins URL) or Poll SCM (Jenkins checks repo periodically).</li>
                    <li>Q: What's the difference between webhooks and Poll SCM?<br>
                    A: Webhooks trigger instantly on push; Poll SCM checks at intervals causing delay and unnecessary load.</li>
                    <li>Q: What happens if the webhook fails to reach Jenkins?<br>
                    A: The build won't trigger. GitHub shows delivery failures in webhook settings. Use Poll SCM as fallback.</li>
                </ul>`
            }
        ]
    },
    'git-push': {
        title: 'Git Push Event',
        icon: '📤',
        animation: 'git-push',
        sections: [
            {
                heading: 'What Happens',
                content: `The git push transmits local commits to the remote repository. Objects are delta-compressed into packfiles 
                and sent over the wire. The remote then updates branch references.`
            },
            {
                heading: 'Internal Workflow',
                content: `<ul>
                    <li>Git negotiates with remote to find common ancestor</li>
                    <li>Only new objects (commits, trees, blobs) are packed</li>
                    <li>Delta compression reduces transfer size</li>
                    <li>Packfile sent via smart HTTP or SSH protocol</li>
                    <li>Remote unpacks and verifies object integrity</li>
                    <li>Remote updates refs/heads/branch-name</li>
                    <li>Server-side post-receive hook fires</li>
                    <li>Webhook service generates event payload</li>
                    <li>Payload includes: commit SHA, branch, author, timestamp, diff stats</li>
                </ul>`
            },
            {
                heading: 'Jenkins Configuration',
                content: `<pre>// GitHub webhook configuration
// URL: http://jenkins.company.com:8080/github-webhook/
// Content type: application/json
// Events: Push, Pull Request

// GitLab webhook
// URL: http://jenkins.company.com:8080/project/job-name
// Trigger: Push events, Merge request events</pre>`
            },
            {
                heading: 'Best Practices',
                content: `<ul>
                    <li>Use branch-specific webhooks to avoid unnecessary builds</li>
                    <li>Configure webhook secret for security (HMAC verification)</li>
                    <li>Set up webhook retry on failure</li>
                    <li>Use dedicated service accounts for Jenkins Git access</li>
                    <li>Implement branch naming conventions for pipeline filtering</li>
                </ul>`
            }
        ]
    },
    'webhook': {
        title: 'Webhook Delivery',
        icon: '🔔',
        animation: 'webhook',
        sections: [
            {
                heading: 'What Happens',
                content: `GitHub/GitLab sends an HTTP POST request to Jenkins with a JSON payload containing 
                all details about the push event. Jenkins authenticates and processes this to trigger the appropriate job.`
            },
            {
                heading: 'Webhook Payload Structure',
                content: `<pre>{
  "ref": "refs/heads/feature/upi-payment",
  "before": "a1b2c3d4e5f6...",
  "after": "e4f5g6h8i9j0...",
  "repository": {
    "full_name": "bank/payment-service",
    "clone_url": "https://github.com/bank/payment-service.git"
  },
  "pusher": {
    "name": "developer",
    "email": "dev@bank.com"
  },
  "commits": [{
    "id": "e4f5g6h8i9j0k1l2m3n4o5p6q7r8s9t0",
    "message": "feat: add UPI transaction validation",
    "timestamp": "2024-01-15T10:15:00Z",
    "added": ["src/main/java/UpiValidator.java"],
    "modified": ["src/main/java/PaymentService.java"]
  }]
}</pre>`
            },
            {
                heading: 'Jenkins Processing',
                content: `<ul>
                    <li>Jenkins receives POST at /github-webhook/ endpoint</li>
                    <li>Verifies HMAC-SHA256 signature using webhook secret</li>
                    <li>Parses JSON payload to extract repository and branch</li>
                    <li>Matches against configured jobs using repository URL</li>
                    <li>Checks branch filters (include/exclude patterns)</li>
                    <li>Creates a new build request for matching jobs</li>
                    <li>Build enters the Jenkins queue system</li>
                </ul>`
            },
            {
                heading: 'Debugging Webhooks',
                content: `<ul>
                    <li>Check GitHub webhook delivery log for response codes</li>
                    <li>Jenkins log: /var/log/jenkins/jenkins.log</li>
                    <li>Verify Jenkins URL is accessible from GitHub (not behind VPN)</li>
                    <li>Check webhook secret matches in both GitHub and Jenkins</li>
                    <li>Use ngrok for local testing</li>
                    <li>Manage Jenkins > System Log > GitHub Webhook for detailed logs</li>
                </ul>`
            },
            {
                heading: 'Interview Questions',
                content: `<ul>
                    <li>Q: How do you secure Jenkins webhooks?<br>
                    A: Use webhook secrets (HMAC-SHA256), restrict source IPs, use HTTPS, and implement authentication tokens.</li>
                    <li>Q: What happens if Jenkins is down when a webhook fires?<br>
                    A: The build is lost unless GitHub retries (configurable). Use Poll SCM as backup.</li>
                </ul>`
            }
        ]
    },
    'trigger': {
        title: 'Jenkins Build Trigger',
        icon: '⚡',
        animation: 'trigger',
        sections: [
            {
                heading: 'What Happens',
                content: `Jenkins processes the webhook, identifies which job should run, validates branch filters and 
                build conditions, then creates a new build and places it in the build queue.`
            },
            {
                heading: 'Trigger Types in Jenkins',
                content: `<ul>
                    <li><strong>Webhook (Push):</strong> Instant trigger on code push</li>
                    <li><strong>Poll SCM:</strong> Jenkins checks repository at intervals</li>
                    <li><strong>Cron (Timer):</strong> Scheduled builds (nightly, weekly)</li>
                    <li><strong>Upstream:</strong> Triggered after another job completes</li>
                    <li><strong>Manual:</strong> User clicks "Build Now"</li>
                    <li><strong>Remote API:</strong> HTTP POST to Jenkins build endpoint</li>
                    <li><strong>Parameterized:</strong> Build with user-provided parameters</li>
                </ul>`
            },
            {
                heading: 'Pipeline Syntax',
                content: `<pre>pipeline {
    triggers {
        // GitHub webhook
        githubPush()
        
        // Poll SCM - check every 5 minutes
        pollSCM('H/5 * * * *')
        
        // Cron - nightly at 2 AM
        cron('0 2 * * *')
        
        // Upstream trigger
        upstream(
            upstreamProjects: 'base-library-build',
            threshold: hudson.model.Result.SUCCESS
        )
    }
    
    // Parameterized build
    parameters {
        string(name: 'BRANCH', defaultValue: 'main')
        booleanParam(name: 'DEPLOY', defaultValue: false)
        choice(name: 'ENV', choices: ['dev', 'staging', 'prod'])
    }
}</pre>`
            },
            {
                heading: 'Internal Process',
                content: `<ul>
                    <li>Jenkins matches the trigger event to configured jobs</li>
                    <li>Evaluates when{} conditions (branch, changeset, expression)</li>
                    <li>Checks if job is not already in queue (quiet period)</li>
                    <li>Creates SCMRevisionState with commit details</li>
                    <li>Assigns build number (monotonically increasing)</li>
                    <li>Places build in the Jenkins queue system</li>
                    <li>Notifies webhooks of build start (GitHub commit status)</li>
                </ul>`
            }
        ]
    },
    'queue': {
        title: 'Jenkins Build Queue',
        icon: '📋',
        animation: 'queue',
        sections: [
            {
                heading: 'What Happens',
                content: `The build enters the Jenkins queue and waits for a suitable executor. Jenkins evaluates 
                node labels, resource availability, and blocking conditions to assign the build to an agent.`
            },
            {
                heading: 'Queue Processing Logic',
                content: `<ul>
                    <li>Build enters queue with a quiet period (default: 5 seconds)</li>
                    <li>Jenkins checks for available executors matching labels</li>
                    <li>Evaluates node affinity rules and label expressions</li>
                    <li>Checks blocking conditions (upstream builds, mutex)</li>
                    <li>Respects build throttle (max concurrent builds)</li>
                    <li>FIFO ordering with priority support</li>
                    <li>If no executor available, build stays in queue</li>
                    <li>Queue items have a stuck timeout (default: none)</li>
                    <li>When executor is free, build is dispatched to node</li>
                </ul>`
            },
            {
                heading: 'Pipeline Syntax',
                content: `<pre>pipeline {
    agent {
        // Specific label
        label 'linux && docker'
    }
    
    options {
        // Quiet period before build starts
        quietPeriod(10)
        
        // Timeout if stuck in queue
        timeout(time: 30, unit: 'MINUTES')
        
        // Throttle concurrent builds
        throttle(['category-name'])
        
        // Disable concurrent builds
        disableConcurrentBuilds()
    }
}</pre>`
            },
            {
                heading: 'Monitoring the Queue',
                content: `<ul>
                    <li>Jenkins Dashboard > Build Queue widget</li>
                    <li>API: /queue/api/json for queue state</li>
                    <li>API: /computer/api/json for executor status</li>
                    <li>Builds stuck in queue indicate capacity issues</li>
                    <li>Labels with no matching nodes cause indefinite waiting</li>
                    <li>Cloud plugins auto-provision agents when queue grows</li>
                </ul>`
            },
            {
                heading: 'Interview Questions',
                content: `<ul>
                    <li>Q: What happens when all executors are busy?<br>
                    A: Builds wait in the queue until an executor with matching labels becomes free. Cloud plugins can auto-scale agents.</li>
                    <li>Q: How do you prioritize builds in the queue?<br>
                    A: Use the Priority Sorter plugin to assign priority levels to jobs. Higher priority builds run first.</li>
                    <li>Q: What is the quiet period?<br>
                    A: A configurable delay (in seconds) before a queued build starts, allowing multiple rapid pushes to collapse into one build.</li>
                </ul>`
            }
        ]
    },
    'executor': {
        title: 'Executor Assignment',
        icon: '⚙️',
        animation: 'executor',
        sections: [
            {
                heading: 'What Happens',
                content: `An executor on a matching agent is allocated to run the build. The executor loads the pipeline definition, 
                resolves the Jenkinsfile, and begins executing the pipeline stages.`
            },
            {
                heading: 'Executor Internal Process',
                content: `<ul>
                    <li>Queue dispatcher assigns build to free executor</li>
                    <li>Executor marks itself as "busy" on the node</li>
                    <li>Loads the pipeline definition (Jenkinsfile from SCM)</li>
                    <li>Parses the Groovy DSL into an execution plan</li>
                    <li>Resolves agent{} blocks and container requirements</li>
                    <li>Initializes the FlowNode execution graph</li>
                    <li>Loads required plugins for pipeline steps</li>
                    <li>Sets up logging and build context</li>
                    <li>Begins executing the first stage</li>
                </ul>`
            },
            {
                heading: 'Executor Configuration',
                content: `<pre>// In Jenkins configuration (Manage Jenkins > Nodes)
// Each node has configurable executor count

// Recommended settings:
// Controller: 0 executors (don't run builds on controller)
// Agent nodes: 2-4 executors (depends on CPU cores)
// Docker agents: 1 executor per container

// Check executor count via API:
// GET /computer/api/json
// Returns nodes with idle/busy executor counts</pre>`
            },
            {
                heading: 'Best Practices',
                content: `<ul>
                    <li>Never run builds on the Jenkins Controller (set executors to 0)</li>
                    <li>Size executors based on available CPU/RAM (1 executor per 2 cores)</li>
                    <li>Use labels to route builds to appropriate agents</li>
                    <li>Monitor executor utilization for capacity planning</li>
                    <li>Use lightweight executors for Pipeline CPS steps</li>
                    <li>Consider cloud agents for elastic scaling</li>
                </ul>`
            }
        ]
    },
    'agent': {
        title: 'Agent Allocation',
        icon: '🖥️',
        animation: 'agent',
        sections: [
            {
                heading: 'What Happens',
                content: `Jenkins selects and provisions the agent (worker node) that will execute the build. For cloud agents, 
                this means spinning up a new pod/VM. For static agents, it allocates an existing connected node.`
            },
            {
                heading: 'Agent Types',
                content: `<ul>
                    <li><strong>Permanent Agents:</strong> Always-connected machines (SSH or JNLP)</li>
                    <li><strong>Cloud Agents:</strong> Dynamically provisioned (Kubernetes, Docker, EC2)</li>
                    <li><strong>Kubernetes Pods:</strong> Ephemeral pods per build with multiple containers</li>
                    <li><strong>Docker Agents:</strong> Containers spun up from images</li>
                    <li><strong>SSH Agents:</strong> Jenkins SSHs into machines to run builds</li>
                    <li><strong>JNLP Agents:</strong> Agent connects outbound to Jenkins controller</li>
                </ul>`
            },
            {
                heading: 'Kubernetes Agent Example',
                content: `<pre>pipeline {
    agent {
        kubernetes {
            yaml '''
            apiVersion: v1
            kind: Pod
            metadata:
              labels:
                jenkins: agent
            spec:
              containers:
              - name: maven
                image: maven:3.9-eclipse-temurin-17
                command: ['sleep', 'infinity']
                resources:
                  limits:
                    cpu: "2"
                    memory: "4Gi"
              - name: docker
                image: docker:24-dind
                securityContext:
                  privileged: true
              volumes:
              - name: maven-cache
                persistentVolumeClaim:
                  claimName: maven-repo-pvc
            '''
        }
    }
}</pre>`
            },
            {
                heading: 'Agent Communication',
                content: `<ul>
                    <li><strong>Remoting Protocol:</strong> Bidirectional channel between controller and agent</li>
                    <li><strong>Heartbeat:</strong> Periodic ping to detect disconnections (default: 10s)</li>
                    <li><strong>Classloading:</strong> Agent downloads required classes from controller</li>
                    <li><strong>File Transfer:</strong> Stash/unstash moves files between nodes</li>
                    <li><strong>Credentials:</strong> Injected securely via Remoting channel</li>
                    <li><strong>Environment:</strong> Variables and tools provisioned on agent</li>
                </ul>`
            },
            {
                heading: 'Interview Questions',
                content: `<ul>
                    <li>Q: What's the difference between SSH and JNLP agents?<br>
                    A: SSH: controller initiates connection (needs network access to agent). JNLP: agent initiates outbound connection (good when agent is behind NAT/firewall).</li>
                    <li>Q: Why use Kubernetes agents?<br>
                    A: Ephemeral, clean environments per build. Auto-scaling. No agent maintenance. Custom containers per job.</li>
                    <li>Q: What happens if an agent disconnects during a build?<br>
                    A: Build fails. Jenkins marks the node as offline. Pipeline can be configured to retry on a different agent.</li>
                </ul>`
            }
        ]
    },
    'workspace': {
        title: 'Workspace Creation',
        icon: '📁',
        animation: 'workspace',
        sections: [
            {
                heading: 'What Happens',
                content: `Jenkins creates (or reuses) a workspace directory on the agent where the build will execute. 
                Environment variables are loaded, tools are verified, and the workspace is prepared for SCM checkout.`
            },
            {
                heading: 'Workspace Details',
                content: `<ul>
                    <li>Default path: /var/jenkins/workspace/&lt;job-name&gt;</li>
                    <li>Each pipeline gets its own workspace directory</li>
                    <li>Workspace persists between builds unless cleaned</li>
                    <li>Multiple concurrent builds get @2, @3 suffixes</li>
                    <li>Environment variables are set: WORKSPACE, BUILD_NUMBER, JOB_NAME</li>
                    <li>Tools defined in pipeline are provisioned (JDK, Maven, Node)</li>
                    <li>Global tool installations are symlinked or added to PATH</li>
                </ul>`
            },
            {
                heading: 'Environment Variables',
                content: `<pre>// Built-in Jenkins environment variables available in workspace:
// BUILD_NUMBER - Current build number (e.g., "142")
// BUILD_ID - Build timestamp ID
// JOB_NAME - Name of the project (e.g., "payment-service-pipeline")
// WORKSPACE - Absolute path to workspace directory
// JENKINS_URL - URL of the Jenkins instance
// GIT_COMMIT - The commit SHA being built
// GIT_BRANCH - The branch being built
// NODE_NAME - Name of the agent running the build
// EXECUTOR_NUMBER - Executor slot number

// Custom environment in Jenkinsfile:
environment {
    APP_NAME = 'payment-service'
    VERSION = sh(script: 'cat VERSION', returnStdout: true).trim()
    CREDENTIALS = credentials('db-password')
}</pre>`
            },
            {
                heading: 'Pipeline Syntax',
                content: `<pre>pipeline {
    agent any
    
    options {
        // Clean workspace before build
        skipDefaultCheckout()
    }
    
    stages {
        stage('Prepare') {
            steps {
                // Clean workspace explicitly
                cleanWs()
                
                // Or delete specific directories
                dir('target') { deleteDir() }
                
                // Custom workspace location
                ws('/custom/path') {
                    sh 'pwd'
                }
            }
        }
    }
    
    post {
        always {
            // Clean workspace after build
            cleanWs()
        }
    }
}</pre>`
            }
        ]
    },
    'checkout': {
        title: 'SCM Checkout',
        icon: '📥',
        animation: 'checkout',
        sections: [
            {
                heading: 'What Happens',
                content: `Jenkins clones or fetches the repository into the workspace. It checks out the exact commit 
                that triggered the build, setting up the source code for compilation and testing.`
            },
            {
                heading: 'Checkout Process',
                content: `<ul>
                    <li>Jenkins resolves Git credentials from the Credentials store</li>
                    <li>Executes git init (or reuses existing .git directory)</li>
                    <li>Runs git fetch origin to download latest objects</li>
                    <li>Checks out the specific commit SHA from the trigger</li>
                    <li>Updates HEAD and working tree to match the commit</li>
                    <li>Git submodules initialized if configured</li>
                    <li>LFS files pulled if Git LFS is enabled</li>
                    <li>Checkout changelog generated (comparing with previous build)</li>
                    <li>SCM revision state saved for the build record</li>
                </ul>`
            },
            {
                heading: 'Pipeline Syntax',
                content: `<pre>pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                // Simple checkout (uses pipeline SCM config)
                checkout scm
                
                // Explicit Git checkout
                git(
                    url: 'https://github.com/bank/payment-service.git',
                    branch: 'main',
                    credentialsId: 'github-token',
                    changelog: true,
                    poll: true
                )
                
                // Advanced checkout with options
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/feature/*']],
                    extensions: [
                        [$class: 'CleanBeforeCheckout'],
                        [$class: 'CloneOption', depth: 1, shallow: true],
                        [$class: 'SubmoduleOption', recursiveSubmodules: true]
                    ],
                    userRemoteConfigs: [[
                        url: 'https://github.com/bank/payment-service.git',
                        credentialsId: 'github-token'
                    ]]
                ])
            }
        }
    }
}</pre>`
            },
            {
                heading: 'Performance Optimization',
                content: `<ul>
                    <li><strong>Shallow clone:</strong> depth: 1 for faster checkout (no history)</li>
                    <li><strong>Reference repos:</strong> Shared bare repo on agent for faster clones</li>
                    <li><strong>Sparse checkout:</strong> Only checkout needed directories</li>
                    <li><strong>Git LFS skip:</strong> Skip large file download if not needed</li>
                    <li><strong>Reuse workspace:</strong> Fetch instead of full clone</li>
                </ul>`
            }
        ]
    },
    'build': {
        title: 'Build Stage',
        icon: '🔨',
        animation: 'build',
        sections: [
            {
                heading: 'What Happens',
                content: `Jenkins invokes the build tool (Maven, Gradle, npm) to compile source code, resolve dependencies, 
                and produce build artifacts. This is where source code becomes executable.`
            },
            {
                heading: 'How Jenkins Executes the Build',
                content: `<ul>
                    <li>Jenkins invokes the build command in the workspace</li>
                    <li>Maven reads pom.xml for project configuration</li>
                    <li>Dependency resolution: Downloads from Maven Central/Nexus</li>
                    <li>Dependency tree built and conflicts resolved</li>
                    <li>Source compilation: .java files compiled to .class files</li>
                    <li>Resource processing: Properties/configs copied to target</li>
                    <li>Build output written to target/ directory</li>
                    <li>All output streamed to Jenkins console in real-time</li>
                    <li>Exit code 0 = success, non-zero = failure</li>
                    <li>Jenkins captures build duration and resource usage</li>
                </ul>`
            },
            {
                heading: 'Pipeline Syntax',
                content: `<pre>stage('Build') {
    steps {
        // Maven build
        container('maven') {
            sh 'mvn clean compile -DskipTests -B'
        }
        
        // Or with Gradle
        sh './gradlew assemble'
        
        // Or with npm
        sh 'npm ci && npm run build'
        
        // Or using Jenkins tool installations
        withMaven(maven: 'Maven-3.9') {
            sh 'mvn clean compile'
        }
    }
    post {
        failure {
            echo 'Build failed! Check compilation errors.'
        }
    }
}</pre>`
            },
            {
                heading: 'Jenkins Plugins Used',
                content: `<ul>
                    <li><strong>Maven Integration:</strong> Automatic POM detection, repository management</li>
                    <li><strong>Gradle Plugin:</strong> Gradle wrapper support, build scans</li>
                    <li><strong>NodeJS Plugin:</strong> Node.js/npm tool installation</li>
                    <li><strong>Pipeline Utility Steps:</strong> readMavenPom(), readJSON()</li>
                    <li><strong>Config File Provider:</strong> Inject Maven settings.xml</li>
                    <li><strong>Artifactory/Nexus:</strong> Dependency caching and artifact publishing</li>
                </ul>`
            },
            {
                heading: 'Common Failures',
                content: `<ul>
                    <li><strong>Dependency resolution:</strong> Network issues downloading from Maven Central</li>
                    <li><strong>Compilation errors:</strong> Syntax errors, missing imports</li>
                    <li><strong>Out of memory:</strong> Increase JVM heap with MAVEN_OPTS=-Xmx1024m</li>
                    <li><strong>Tool not found:</strong> Java/Maven not installed on agent</li>
                    <li><strong>Permission denied:</strong> Workspace file permission issues</li>
                </ul>`
            },
            {
                heading: 'Interview Questions',
                content: `<ul>
                    <li>Q: How does Jenkins handle build tool installations?<br>
                    A: Via Global Tool Configuration. Tools can be auto-installed or pre-installed on agents. Pipeline uses tool directive.</li>
                    <li>Q: How do you cache dependencies in Jenkins?<br>
                    A: Use persistent volumes for .m2/repository, configure Nexus/Artifactory as proxy, or use agent-level caching.</li>
                </ul>`
            }
        ]
    },
    'test': {
        title: 'Unit Testing',
        icon: '🧪',
        animation: 'test',
        sections: [
            {
                heading: 'What Happens',
                content: `Jenkins executes the test suite (JUnit, TestNG, Jest) and collects results. 
                Test reports are parsed, code coverage calculated, and trend graphs updated.`
            },
            {
                heading: 'Testing Process in Jenkins',
                content: `<ul>
                    <li>Jenkins invokes test command (mvn test, npm test)</li>
                    <li>Test framework discovers and executes test classes</li>
                    <li>Each test method runs with assertions</li>
                    <li>Mocking frameworks (Mockito) provide test doubles</li>
                    <li>Results written to XML reports (JUnit format)</li>
                    <li>Coverage tool (JaCoCo) instruments code during tests</li>
                    <li>Coverage report generated (line, branch, method)</li>
                    <li>Jenkins parses XML reports with junit step</li>
                    <li>Test trend graph updated on job page</li>
                    <li>Flaky test detection based on historical data</li>
                </ul>`
            },
            {
                heading: 'Pipeline Syntax',
                content: `<pre>stage('Unit Tests') {
    steps {
        container('maven') {
            sh 'mvn test -Dmaven.test.failure.ignore=false'
        }
    }
    post {
        always {
            // Publish JUnit test results
            junit(
                testResults: '**/target/surefire-reports/*.xml',
                allowEmptyResults: false
            )
            
            // Publish code coverage
            jacoco(
                execPattern: '**/target/jacoco.exec',
                classPattern: '**/target/classes',
                sourcePattern: '**/src/main/java',
                minimumLineCoverage: '80',
                maximumLineCoverage: '100'
            )
        }
        failure {
            // Notify on test failure
            echo "Tests failed! Check test results."
        }
    }
}</pre>`
            },
            {
                heading: 'Test Result Visualization',
                content: `<ul>
                    <li>Jenkins shows pass/fail/skip counts on build page</li>
                    <li>Test trend graph shows test count over time</li>
                    <li>Failed tests listed with stack traces</li>
                    <li>Code coverage report with line-by-line highlighting</li>
                    <li>Coverage gates can fail the build if below threshold</li>
                    <li>Flaky tests marked in test result history</li>
                </ul>`
            }
        ]
    },
    'sonar': {
        title: 'SonarQube Analysis',
        icon: '🔍',
        animation: 'sonar',
        sections: [
            {
                heading: 'What Happens',
                content: `Jenkins triggers SonarQube to perform static code analysis. The scanner examines source code 
                for bugs, vulnerabilities, code smells, and calculates technical debt. Results are uploaded to the SonarQube server.`
            },
            {
                heading: 'How Jenkins Orchestrates SonarQube',
                content: `<ul>
                    <li>Jenkins invokes sonar-scanner or mvn sonar:sonar</li>
                    <li>Scanner reads sonar-project.properties or pom.xml config</li>
                    <li>Source files analyzed using language-specific rules</li>
                    <li>Bug detection: Null pointer, resource leaks, logic errors</li>
                    <li>Security scanning: SQL injection, XSS, hardcoded secrets</li>
                    <li>Code smell detection: Duplications, complexity, naming</li>
                    <li>Coverage data imported from JaCoCo/Istanbul reports</li>
                    <li>Analysis report uploaded to SonarQube server</li>
                    <li>Server processes report and updates project dashboard</li>
                    <li>Quality Gate evaluated against defined thresholds</li>
                </ul>`
            },
            {
                heading: 'Pipeline Syntax',
                content: `<pre>stage('SonarQube Analysis') {
    steps {
        // Using SonarQube plugin
        withSonarQubeEnv('SonarQube-Server') {
            sh '''mvn sonar:sonar \\
                -Dsonar.projectKey=payment-service \\
                -Dsonar.sources=src/main/java \\
                -Dsonar.tests=src/test/java \\
                -Dsonar.java.coveragePlugin=jacoco \\
                -Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml'''
        }
    }
}

stage('Quality Gate') {
    steps {
        // Wait for SonarQube to finish processing
        timeout(time: 5, unit: 'MINUTES') {
            waitForQualityGate abortPipeline: true
        }
    }
}</pre>`
            },
            {
                heading: 'Jenkins Plugins Required',
                content: `<ul>
                    <li><strong>SonarQube Scanner:</strong> Core integration plugin</li>
                    <li><strong>Quality Gate:</strong> waitForQualityGate step</li>
                    <li><strong>Configuration:</strong> Manage Jenkins > SonarQube Servers</li>
                    <li><strong>Webhook:</strong> SonarQube webhook back to Jenkins for QG result</li>
                </ul>`
            }
        ]
    },
    'quality-gate': {
        title: 'Quality Gate Check',
        icon: '✅',
        animation: 'quality-gate',
        sections: [
            {
                heading: 'What Happens',
                content: `Jenkins waits for SonarQube to process the analysis and evaluate the Quality Gate. 
                If the code meets all defined thresholds (coverage, bugs, vulnerabilities), the pipeline continues. Otherwise, it fails.`
            },
            {
                heading: 'Quality Gate Conditions',
                content: `<ul>
                    <li>Coverage on new code &ge; 80%</li>
                    <li>Duplicated lines on new code &lt; 3%</li>
                    <li>Maintainability rating: A (debt ratio &lt; 5%)</li>
                    <li>Reliability rating: A (zero bugs)</li>
                    <li>Security rating: A (zero vulnerabilities)</li>
                    <li>Security hotspots reviewed: 100%</li>
                    <li>All conditions must pass for Quality Gate = PASSED</li>
                </ul>`
            },
            {
                heading: 'How It Works with Jenkins',
                content: `<pre>// SonarQube sends webhook to Jenkins after analysis:
// POST http://jenkins:8080/sonarqube-webhook/
// Payload: { "status": "SUCCESS", "qualityGate": { "status": "OK" } }

// Jenkins waits for this webhook:
stage('Quality Gate') {
    steps {
        timeout(time: 5, unit: 'MINUTES') {
            // This step blocks until SonarQube webhook arrives
            waitForQualityGate abortPipeline: true
            // abortPipeline: true means build fails if QG fails
        }
    }
}</pre>`
            }
        ]
    },
    'package': {
        title: 'Package & Archive',
        icon: '📦',
        animation: 'package',
        sections: [
            {
                heading: 'What Happens',
                content: `Jenkins packages the compiled code into a deployable artifact (JAR, WAR, Docker image). 
                The artifact is archived in Jenkins and fingerprinted for traceability.`
            },
            {
                heading: 'Packaging Process',
                content: `<ul>
                    <li>Maven/Gradle creates the final artifact (JAR/WAR)</li>
                    <li>MANIFEST.MF generated with version and metadata</li>
                    <li>Dependencies bundled (fat JAR) or referenced (thin JAR)</li>
                    <li>Resources and configs included in the package</li>
                    <li>Artifact archived in Jenkins (persists across builds)</li>
                    <li>Fingerprint (MD5) generated for artifact tracking</li>
                    <li>Artifact can be published to Nexus/Artifactory</li>
                </ul>`
            },
            {
                heading: 'Pipeline Syntax',
                content: `<pre>stage('Package') {
    steps {
        container('maven') {
            sh 'mvn package -DskipTests'
        }
        
        // Archive artifacts in Jenkins
        archiveArtifacts(
            artifacts: 'target/*.jar',
            fingerprint: true,
            onlyIfSuccessful: true
        )
        
        // Fingerprint for downstream tracking
        fingerprint 'target/*.jar'
        
        // Stash for use on other nodes
        stash(
            name: 'app-jar',
            includes: 'target/*.jar'
        )
    }
}</pre>`
            },
            {
                heading: 'Artifact Management',
                content: `<ul>
                    <li><strong>archiveArtifacts:</strong> Store artifacts in Jenkins build record</li>
                    <li><strong>fingerprint:</strong> Track artifact usage across jobs</li>
                    <li><strong>stash/unstash:</strong> Move files between pipeline nodes</li>
                    <li><strong>Nexus/Artifactory:</strong> External artifact repository</li>
                    <li><strong>Retention:</strong> Configure how long artifacts are kept</li>
                </ul>`
            }
        ]
    },
    'docker': {
        title: 'Docker Build & Push',
        icon: '🐳',
        animation: 'docker',
        sections: [
            {
                heading: 'How Jenkins Executes Docker',
                content: `Jenkins calls Docker CLI to build a container image from a Dockerfile, tag it with the commit SHA, 
                and push it to a container registry. Jenkins orchestrates Docker — it doesn't replace it.`
            },
            {
                heading: 'Jenkins Docker Workflow',
                content: `<ul>
                    <li>Jenkins executes 'docker build' command in the workspace</li>
                    <li>Docker daemon reads the Dockerfile</li>
                    <li>Each Dockerfile instruction creates an image layer</li>
                    <li>Build context (workspace) sent to Docker daemon</li>
                    <li>Image tagged with registry/name:commit-sha</li>
                    <li>Jenkins authenticates with container registry</li>
                    <li>Image pushed to registry (ECR, GCR, Docker Hub, Harbor)</li>
                    <li>Image digest returned and logged</li>
                    <li>Jenkins can also push a 'latest' tag</li>
                </ul>`
            },
            {
                heading: 'Pipeline Syntax',
                content: `<pre>stage('Docker Build & Push') {
    steps {
        container('docker') {
            script {
                // Build the image
                def image = docker.build(
                    "registry.bank.internal/payment-service:${env.GIT_COMMIT_SHORT}",
                    "--build-arg APP_VERSION=${env.VERSION} ."
                )
                
                // Push to registry with credentials
                docker.withRegistry(
                    'https://registry.bank.internal',
                    'registry-credentials'
                ) {
                    image.push()            // Push with commit SHA tag
                    image.push('latest')    // Also push as latest
                }
            }
        }
    }
}</pre>`
            },
            {
                heading: 'Jenkins Plugins',
                content: `<ul>
                    <li><strong>Docker Pipeline:</strong> docker.build(), docker.withRegistry()</li>
                    <li><strong>Docker Commons:</strong> Docker credential management</li>
                    <li><strong>CloudBees Docker Build and Publish:</strong> Simplified Docker builds</li>
                </ul>`
            }
        ]
    },
    'deploy': {
        title: 'Deployment',
        icon: '🚀',
        animation: 'deploy',
        sections: [
            {
                heading: 'How Jenkins Deploys',
                content: `Jenkins executes deployment scripts/commands, applies Kubernetes manifests, and monitors the rollout. 
                Jenkins orchestrates the deployment process — the actual deployment is done by Kubernetes, Ansible, or other tools.`
            },
            {
                heading: 'Jenkins Deployment Process',
                content: `<ul>
                    <li>Jenkins loads deployment credentials (kubeconfig, SSH keys)</li>
                    <li>Applies Kubernetes manifests (kubectl apply)</li>
                    <li>Or executes deployment scripts (Ansible, Terraform)</li>
                    <li>Monitors rollout status (kubectl rollout status)</li>
                    <li>Waits for pods/instances to become healthy</li>
                    <li>Runs smoke tests against deployed service</li>
                    <li>Reports deployment status back to pipeline</li>
                    <li>Sends notifications (Slack, email) on completion</li>
                </ul>`
            },
            {
                heading: 'Pipeline Syntax',
                content: `<pre>stage('Deploy to Staging') {
    steps {
        // Using kubectl
        withKubeConfig(credentialsId: 'k8s-staging') {
            sh '''
                kubectl set image deployment/payment-service \\
                    app=registry.bank.internal/payment-service:${GIT_COMMIT_SHORT} \\
                    -n payments-staging
                    
                kubectl rollout status deployment/payment-service \\
                    -n payments-staging --timeout=300s
            '''
        }
    }
}

stage('Deploy to Production') {
    when { branch 'main' }
    input {
        message 'Deploy to production?'
        ok 'Deploy'
        submitter 'admin,release-team'
    }
    steps {
        // Production deployment with approval gate
        withKubeConfig(credentialsId: 'k8s-prod') {
            sh 'kubectl apply -f k8s/production/'
            sh 'kubectl rollout status deployment/payment-service -n payments-prod'
        }
    }
}</pre>`
            },
            {
                heading: 'Deployment Strategies via Jenkins',
                content: `<ul>
                    <li><strong>Rolling Update:</strong> Gradual replacement (Kubernetes default)</li>
                    <li><strong>Blue/Green:</strong> Switch traffic between two environments</li>
                    <li><strong>Canary:</strong> Deploy to subset of users first</li>
                    <li><strong>Input Step:</strong> Manual approval gate before production</li>
                    <li><strong>Rollback:</strong> Jenkins can trigger rollback on failure</li>
                </ul>`
            }
        ]
    },
    'health-check': {
        title: 'Health Check & Notification',
        icon: '💚',
        animation: 'health-check',
        sections: [
            {
                heading: 'What Happens',
                content: `Jenkins verifies the deployment is healthy by hitting health endpoints, then sends notifications 
                about the pipeline result to Slack, email, or other channels.`
            },
            {
                heading: 'Health Check Process',
                content: `<ul>
                    <li>Jenkins sends HTTP GET to /actuator/health endpoint</li>
                    <li>Checks response code is 200</li>
                    <li>Validates response body shows all components UP</li>
                    <li>May check multiple endpoints (readiness, liveness)</li>
                    <li>Retries with backoff if service is still starting</li>
                    <li>Timeout after configured duration</li>
                    <li>On success: pipeline marked SUCCESS</li>
                    <li>On failure: triggers rollback or alerts</li>
                </ul>`
            },
            {
                heading: 'Pipeline Syntax',
                content: `<pre>stage('Health Check') {
    steps {
        script {
            // HTTP health check
            def response = httpRequest(
                url: "http://payment-service.prod.svc/actuator/health",
                validResponseCodes: '200',
                timeout: 60
            )
            
            def health = readJSON(text: response.content)
            assert health.status == 'UP'
            echo "All components healthy: ${health.components.keySet()}"
        }
    }
}

// Post-pipeline notifications
post {
    success {
        slackSend(
            channel: '#deployments',
            color: 'good',
            message: "✅ ${env.JOB_NAME} #${env.BUILD_NUMBER} deployed successfully"
        )
    }
    failure {
        slackSend(
            channel: '#deployments',
            color: 'danger',
            message: "❌ ${env.JOB_NAME} #${env.BUILD_NUMBER} FAILED"
        )
        emailext(
            subject: "FAILED: ${env.JOB_NAME}",
            body: "Check: ${env.BUILD_URL}",
            to: 'team@bank.com'
        )
    }
    always {
        // Clean up workspace
        cleanWs()
    }
}</pre>`
            },
            {
                heading: 'Best Practices',
                content: `<ul>
                    <li>Always verify deployment health before marking success</li>
                    <li>Use retry logic with exponential backoff</li>
                    <li>Check all critical dependencies (DB, Redis, Kafka)</li>
                    <li>Set appropriate timeouts</li>
                    <li>Send notifications on both success and failure</li>
                    <li>Include build URL in notifications for quick access</li>
                    <li>Clean workspace in post.always to save disk space</li>
                </ul>`
            }
        ]
    }
};

// ============================================================================
// Jenkins Topics Data - Comprehensive topic cards
// ============================================================================
const JENKINS_TOPICS = [
    { icon: '🔧', title: 'Jenkins Installation', description: 'Install Jenkins on Linux, Docker, or Kubernetes. Configure initial setup wizard.', level: 'beginner' },
    { icon: '🎛️', title: 'Controller vs Agent', description: 'Master-slave architecture. How controller distributes work to agent nodes.', level: 'beginner' },
    { icon: '⚡', title: 'Executors & Nodes', description: 'Configure executor count, labels, and node management for optimal parallelism.', level: 'beginner' },
    { icon: '📁', title: 'Workspace Management', description: 'How Jenkins manages workspaces. Cleaning, sharing, and custom workspace paths.', level: 'beginner' },
    { icon: '📋', title: 'Freestyle Jobs', description: 'Traditional Jenkins jobs with UI-based configuration. Build steps and post-build actions.', level: 'beginner' },
    { icon: '🔄', title: 'Pipeline Jobs', description: 'Modern Jenkins pipelines defined as code. Jenkinsfile stored in SCM.', level: 'intermediate' },
    { icon: '🌿', title: 'Multibranch Pipeline', description: 'Auto-discover branches with Jenkinsfiles. Per-branch pipeline execution.', level: 'intermediate' },
    { icon: '📝', title: 'Declarative Pipeline', description: 'Structured pipeline syntax with pipeline{}, stages{}, steps{}. Opinionated and easy.', level: 'intermediate' },
    { icon: '💻', title: 'Scripted Pipeline', description: 'Full Groovy power with node{} and stage{}. Maximum flexibility for complex logic.', level: 'advanced' },
    { icon: '🔑', title: 'Credentials Management', description: 'Secure storage of secrets, SSH keys, certificates. Credential scoping and binding.', level: 'intermediate' },
    { icon: '📚', title: 'Shared Libraries', description: 'Reusable pipeline code across multiple projects. Global and folder-level libraries.', level: 'advanced' },
    { icon: '🧩', title: 'Plugin Management', description: 'Install, update, and manage Jenkins plugins. Dependency resolution and security.', level: 'intermediate' },
    { icon: '⏰', title: 'Build Triggers', description: 'Webhooks, Poll SCM, Cron, Upstream, Remote API, and parameterized triggers.', level: 'intermediate' },
    { icon: '🔔', title: 'Webhooks Deep Dive', description: 'Configure GitHub/GitLab webhooks. Security, debugging, and payload handling.', level: 'intermediate' },
    { icon: '📊', title: 'Parallel Stages', description: 'Run stages concurrently for faster pipelines. Parallel and Matrix builds.', level: 'advanced' },
    { icon: '🔲', title: 'Matrix Builds', description: 'Test across multiple dimensions (OS, JDK versions). Declarative matrix syntax.', level: 'advanced' },
    { icon: '✋', title: 'Input Steps', description: 'Human approval gates in pipelines. Timeout, submitter restrictions, parameters.', level: 'intermediate' },
    { icon: '📦', title: 'Artifact Management', description: 'Archive, fingerprint, stash/unstash. External artifact repos (Nexus, Artifactory).', level: 'intermediate' },
    { icon: '🌐', title: 'Environment Variables', description: 'Built-in and custom env vars. Credential binding. withEnv and environment{} block.', level: 'intermediate' },
    { icon: '🔐', title: 'Security & RBAC', description: 'Role-Based Access Control. Matrix authorization. Folder-level permissions.', level: 'advanced' },
    { icon: '📡', title: 'Jenkins REST API', description: 'Programmatic access to Jenkins. Trigger builds, read status, manage jobs via API.', level: 'advanced' },
    { icon: '🔄', title: 'Backup & Restore', description: 'Backup JENKINS_HOME. ThinBackup plugin. Disaster recovery procedures.', level: 'advanced' },
    { icon: '🏗️', title: 'High Availability', description: 'Jenkins HA architectures. Active-passive, shared storage, Kubernetes-based HA.', level: 'expert' },
    { icon: '📈', title: 'Performance Tuning', description: 'Optimize Jenkins for large-scale deployments. JVM tuning, plugin optimization.', level: 'expert' },
    { icon: '🔍', title: 'Monitoring & Observability', description: 'Monitor Jenkins with Prometheus/Grafana. Health checks. Build metrics and alerting.', level: 'advanced' },
    { icon: '🐛', title: 'Troubleshooting', description: 'Common Jenkins issues. Log analysis. Debug pipelines. Agent connectivity problems.', level: 'intermediate' },
    { icon: '🏭', title: 'Production Best Practices', description: 'Hardening Jenkins for production. Security, scaling, maintenance, and governance.', level: 'expert' },
    { icon: '☁️', title: 'Jenkins on Kubernetes', description: 'Deploy Jenkins on K8s. Dynamic pod agents. Helm charts. StatefulSet configuration.', level: 'expert' },
    { icon: '🔀', title: 'Distributed Builds', description: 'Multi-node setup. Agent clouds. Label-based routing. Cross-platform builds.', level: 'advanced' },
    { icon: '📋', title: 'Configuration as Code', description: 'JCasC plugin. Manage entire Jenkins config in YAML. GitOps for Jenkins itself.', level: 'advanced' }
];

// ============================================================================
// Stage Modal System
// ============================================================================

// Open stage detail modal with comprehensive learning content
function openStageModal(stageId) {
    const content = STAGE_CONTENT[stageId];
    if (!content) return;

    const modal = document.getElementById('stage-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalIcon = document.getElementById('modal-icon');
    const modalBody = document.getElementById('modal-body');

    modalTitle.textContent = content.title;
    modalIcon.textContent = content.icon;

    // Build modal body with all sections
    let bodyHtml = '';

    // Add animated visualization area
    bodyHtml += `<div class="stage-animation" id="stage-anim-${stageId}"></div>`;

    // Add each learning section
    content.sections.forEach(section => {
        bodyHtml += `<h3>${section.heading}</h3>`;
        bodyHtml += `<div>${section.content}</div>`;
    });

    modalBody.innerHTML = bodyHtml;

    // Show modal with animation
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Start stage-specific animation
    startStageAnimation(stageId);
}

// Close modal
function closeStageModal() {
    const modal = document.getElementById('stage-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Start the animated visualization for a specific stage
function startStageAnimation(stageId) {
    const container = document.getElementById(`stage-anim-${stageId}`);
    if (!container) return;

    // Animation definitions per stage type
    const animations = {
        'developer': [
            { text: '// Writing code...', x: 10, y: 20, delay: 0 },
            { text: 'git add .', x: 10, y: 50, delay: 500 },
            { text: 'git commit -m "feat: UPI"', x: 10, y: 80, delay: 1000 },
            { text: 'SHA: e4f5g6h', x: 50, y: 50, delay: 1500 },
            { text: 'git push origin feature', x: 10, y: 110, delay: 2000 },
            { text: '→ Remote received', x: 55, y: 110, delay: 2500 }
        ],
        'webhook': [
            { text: 'POST /github-webhook/', x: 5, y: 20, delay: 0 },
            { text: 'X-GitHub-Event: push', x: 5, y: 50, delay: 400 },
            { text: 'Content-Type: application/json', x: 5, y: 75, delay: 800 },
            { text: '{"ref":"feature/upi"}', x: 5, y: 105, delay: 1200 },
            { text: '→ Jenkins receives event', x: 45, y: 60, delay: 1800 },
            { text: '✓ 200 OK', x: 70, y: 105, delay: 2200 }
        ],
        'trigger': [
            { text: 'Webhook received', x: 5, y: 20, delay: 0 },
            { text: 'Authenticating...', x: 5, y: 50, delay: 500 },
            { text: 'Job match: payment-service', x: 5, y: 80, delay: 1000 },
            { text: 'Build #142 created', x: 45, y: 50, delay: 1500 },
            { text: '→ Entering queue', x: 45, y: 80, delay: 2000 }
        ],
        'build': [
            { text: 'mvn clean compile', x: 5, y: 20, delay: 0 },
            { text: 'Downloading deps...', x: 5, y: 50, delay: 600 },
            { text: 'Compiling 127 files', x: 5, y: 80, delay: 1200 },
            { text: '████████░░ 80%', x: 5, y: 110, delay: 1800 },
            { text: 'BUILD SUCCESS', x: 50, y: 80, delay: 2400 },
            { text: 'Time: 34.2s', x: 50, y: 110, delay: 2800 }
        ],
        'test': [
            { text: 'mvn test', x: 5, y: 20, delay: 0 },
            { text: 'UpiTransactionTest: 24 ✓', x: 5, y: 50, delay: 600 },
            { text: 'CustomerApiTest: 18 ✓', x: 5, y: 80, delay: 1200 },
            { text: 'SecurityTest: 12 ✓', x: 5, y: 110, delay: 1800 },
            { text: 'Coverage: 87.3%', x: 55, y: 80, delay: 2400 },
            { text: '54/54 PASSED', x: 55, y: 110, delay: 2800 }
        ],
        'docker': [
            { text: 'docker build .', x: 5, y: 20, delay: 0 },
            { text: 'FROM temurin:17-jre', x: 5, y: 50, delay: 500 },
            { text: 'COPY target/*.jar app.jar', x: 5, y: 80, delay: 1000 },
            { text: 'Built: abc123def', x: 5, y: 110, delay: 1500 },
            { text: 'Pushing to registry...', x: 50, y: 50, delay: 2000 },
            { text: '✓ Image pushed', x: 50, y: 80, delay: 2500 }
        ],
        'deploy': [
            { text: 'kubectl apply -f k8s/', x: 5, y: 20, delay: 0 },
            { text: 'deployment configured', x: 5, y: 50, delay: 600 },
            { text: 'Rollout: 1/3 ready', x: 5, y: 80, delay: 1200 },
            { text: 'Rollout: 2/3 ready', x: 5, y: 110, delay: 1800 },
            { text: 'Rollout: 3/3 ready', x: 45, y: 80, delay: 2400 },
            { text: '✓ Deployed!', x: 60, y: 110, delay: 2800 }
        ]
    };

    // Get animation for this stage (fallback to generic)
    const stageAnims = animations[stageId] || animations['trigger'];

    // Clear container and render animated items
    container.innerHTML = '';
    stageAnims.forEach(item => {
        const el = document.createElement('div');
        el.className = 'stage-animation-item';
        el.textContent = item.text;
        el.style.left = item.x + '%';
        el.style.top = item.y + 'px';
        container.appendChild(el);

        // Trigger visibility with delay
        setTimeout(() => {
            el.classList.add('visible');
        }, item.delay);
    });
}

// ============================================================================
// Render Topics Grid
// ============================================================================
function renderTopics() {
    const grid = document.getElementById('topics-grid');
    if (!grid) return;

    grid.innerHTML = JENKINS_TOPICS.map(topic => `
        <div class="topic-card">
            <div class="topic-icon">${topic.icon}</div>
            <div class="topic-title">${topic.title}</div>
            <div class="topic-description">${topic.description}</div>
            <span class="topic-level ${topic.level}">${topic.level}</span>
        </div>
    `).join('');
}

// ============================================================================
// Initialize on DOM Load
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Render topics grid
    renderTopics();

    // Bind modal close events
    const modalClose = document.getElementById('modal-close');
    const modalOverlay = document.getElementById('stage-modal');

    if (modalClose) {
        modalClose.addEventListener('click', closeStageModal);
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeStageModal();
            }
        });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeStageModal();
        }
    });
});

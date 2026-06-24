type MaybePromise<T> = T | Promise<T>

declare namespace Api {
    export interface Error {
        message: string
        items?: string[]

        // inject by invoke
        unauth?: boolean
        forbidden?: boolean
        notFound?: boolean
        validate?: string[]
        // set when the API rejects a domain delete because routes still depend
        // on it; routes lists the blocking "<host><path>" identifiers and
        // routesMore is the count elided past the server's cap.
        domainInUsed?: boolean
        routes?: string[]
        routesMore?: number
    }

    export type Response<T> =
        | { ok: true; result: T; error?: never }
        | { ok: false; error: Error; result?: never }

    export type Profile = {
        email: string
    }

    export interface List<T> {
        items: T[]
    }

    // A scoped (agent) token minted via me.generateToken. The token value is
    // never returned by me.listTokens — only this non-secret metadata.
    export interface ScopedToken {
        id: string
        label: string
        permissions: string[]
        createdAt: string
        expiresAt: string
    }

    export type ProjectQuota = {
        deployments: number
        deploymentMaxReplicas: number
    }

    export type ProjectConfig = {
    }

    export type Project = {
        id: string
        project: string
        name: string
        billingAccount: string
        quota: ProjectQuota
        config: ProjectConfig
        createdAt: string
    }

    export type BillingAccount = {
        id: string
        name: string
        taxId: string
        taxName: string
        taxAddress: string
        active: boolean
    }

    export type ProjectUsage = {
        cpuUsage: number
        cpu: number
        memory: number
        egress: number
        registryEgress: number
        dropboxEgress: number
        disk: number
        replica: number
        staticStorage: number
    }

    export type BillingProject = {
        price: number
    }

    export type PodStatus = {
        count: number
        ready: number
        succeeded: number
        failed: number
    }

    export type PodError = {
        name: string
        phase: string
        ready: boolean
        restartCount: number
        waitingReason?: string
        waitingMessage?: string
        terminatedReason?: string
        terminatedExitCode?: number
        lastTerminatedReason?: string
        lastTerminatedExitCode?: number
        message?: string
    }

    export type RouteConfig = {
        basicAuth?: {
            user: string
            password: string
        }
        forwardAuth?: {
            target: string
            authRequestHeaders: string[]
            authResponseHeaders: string[]
        }
        // Override the Host header forwarded upstream (external http:// and
        // deployment:// targets). Empty keeps the request's original Host.
        host?: string
    }

    export type Route = {
        location: string
        domain: string
        path: string
        target: string
        deployment: string
        config: RouteConfig
        createdAt: string
        createdBy: string
    }

    export type Location = {
        id: string
        domainSuffix: string
        endpoint: string
        cname: string
        cpuAllocatable: string[]
        memoryAllocatable: string[]
        features: {
            workloadIdentity?: boolean
            disk?: Record<string, never>
            waf?: Record<string, never>
            cache?: Record<string, never>
        }
        createdAt: string
    }

    export type Domain = {
        project: string
        location: string
        domain: string
        wildcard: boolean
        verification: {
            ownership: {
                type: string
                name: string
                value: string
                errors: string[]
            }
            ssl: {
                pending: boolean
                dcv: {
                    name: string
                    value: string
                }
                records: {
                    txtName: string
                    txtValue: string
                }[]
                errors: string[]
            }
            dns: {
                verifiedAt?: string
                lastCheckedAt?: string
                errors?: string[]
            }
        },
        dnsConfig: {
            ipv4: string[]
            ipv6: string[]
            cname: string[]
        }
        status: 'pending' | 'success' | 'error' | 'verify'
        certStatus: 'none' | 'pendingCreate' | 'created' | 'pendingDelete'
        certPendingSince?: string
        createdAt: string
        createdBy: string
    }

    export type PullSecretSpec = {
        server: string
        username: string
        password: string
    }

    export type PullSecret = {
        name: string
        value: string
        spec: PullSecretSpec
        location: string
        action: 'create' | 'delete',
        status: 'pending' | 'success' | 'error'
        createdAt: string
        createdBy: string
    }

    export type WorkloadIdentity = {
        project: string
        location: string
        name: string
        gsa: string
        status: 'pending' | 'success' | 'error'
        createdAt: string
        createdBy: string
    }

    export type Disk = {
        project: string
        location: string
        name: string
        size: number
        status: 'pending' | 'success' | 'error'
        action: 'create' | 'delete'
        createdAt: string
        createdBy: string
        successAt: string
    }

    export type Role = {
        role: string
        name: string
        permissions: string[]
        createdAt: string
        createdBy: string
    }

    export type RoleUser = {
        email: string
        roles: string[]
    }

    export type Env = {
        [key: string]: string
    }

    export type EnvGroup = {
        project: string
        name: string
        env: Env
        createdAt: string
        createdBy: string
    }

    // Reduced projection returned by envGroup.list (the full env map requires
    // envGroup.get). An env group is a pure secret store, so the list carries
    // only metadata + envCount (the number of variables) — never the values.
    export type EnvGroupListItem = {
        project: string
        name: string
        envCount: number
        createdAt: string
        createdBy: string
    }

    export type MountData = {
        [key: string]: string
    }

    export type Annotations = {
        [key: string]: string
    }

    export type DeploymentDisk = {
        name: string
        mountPath: string
        subPath: string
    }

    export enum DeploymentProtocol {
        HTTP = 'http',
        HTTPS = 'https',
        H2C = 'h2c'
    }

    export type Resource = {
        cpu: string
        memory: string
    }

    export type DeploymentResource = {
        requests: Resource
        limits: Resource
    }

    export type CloudSqlProxySidecar = {
        instance: string
        port: number
        credentials: string
        autoIamAuthn?: boolean
        privateIp?: boolean
    }

    export type AlloyDbProxySidecar = {
        instance: string
        port: number
        credentials: string
    }

    export type Sidecar = {
        cloudSqlProxy?: CloudSqlProxySidecar
        alloyDbProxy?: AlloyDbProxySidecar
    }

    export type SidecarType = '' | 'cloudSqlProxy' | 'alloyDbProxy'

    /**
     * Editable form shape for a sidecar. Carries a discriminator plus a
     * config slot per variant so the form can switch between types without
     * losing partial input.
     */
    export type SidecarForm = {
        type: SidecarType
        cloudSqlProxy: {
            instance: string
            port: number | null
            credentials: string
            autoIamAuthn: boolean
            privateIp: boolean
        }
        alloyDbProxy: {
            instance: string
            port: number | null
            credentials: string
        }
    }

    export type DeploymentType =
        'WebService' |
        'TCPService' |
        'InternalTCPService' |
        'Worker' |
        'CronJob' |
        'Static'

    export type DeploymentAction =
        'deploy' |
        'delete' |
        'pause'

    export type DeploymentStatus =
        'pending' |
        'success' |
        'error' |
        'cancelled'

    // Per-deployment Google-login gate. Optional/pointer on the wire: nil OR
    // requireGoogleLogin=false means the deployment is PUBLIC. When gated with
    // both lists empty, any signed-in Google account may access. The server is
    // authoritative — it lowercases/dedupes and validates emails/domains.
    export type DeploymentAccessConfig = {
        requireGoogleLogin: boolean
        allowedEmails: string[]
        allowedDomains: string[]
    }

    export type Deployment = {
        project: string
        location: string
        name: string
        type: DeploymentType
        revision: number
        image: string
        // Static deployments carry a content-addressed release pointer instead
        // of a container image. `site` is the `site://<bucket>/<project>/<name>@<release-sha>`
        // URI; `siteManifestDigest` is the bare release-sha.
        site?: string
        siteManifestDigest?: string
        env: Env
        envGroups: string[]
        command: string[]
        args: string[]
        workloadIdentity: string
        pullSecret: string
        disk?: DeploymentDisk
        mountData: MountData
        minReplicas: number
        maxReplicas: number
        schedule: string
        port: number
        protocol: DeploymentProtocol
        internal: boolean
        nodePort: number
        annotations: Annotations
        resources: DeploymentResource
        sidecars: Sidecar[]
        access?: DeploymentAccessConfig | null
        url: string
        releaseUrl?: string
        internalUrl: string
        logUrl: string
        eventUrl: string
        podsUrl: string
        statusUrl: string
        errorsUrl: string
        address: string
        internalAddress: string
        status: DeploymentStatus
        action: DeploymentAction
        allocatedPrice: number
        createdAt: string
        createdBy: string
        successAt: string
        ttl: number
        expiresAt: string
    }

    // Reduced projection returned by deployment.list (a strict subset of
    // Deployment with identical field names). It deliberately omits every
    // sensitive field (env, mountData, command, args, annotations,
    // workloadIdentity, pullSecret, disk, access, sidecars) AND the signed log
    // JWTs (logUrl/eventUrl/podsUrl/statusUrl/errorsUrl) and in-cluster
    // address/URL — those are bearer capabilities and require deployment.get.
    // The security boundary lives in the type: a list item cannot carry a secret.
    export type DeploymentListItem = {
        project: string
        location: string
        name: string
        type: DeploymentType
        revision: number
        image: string
        site?: string
        siteManifestDigest?: string
        minReplicas: number
        maxReplicas: number
        schedule: string
        port: number
        protocol: DeploymentProtocol
        internal: boolean
        resources: DeploymentResource
        url: string
        releaseUrl?: string
        status: DeploymentStatus
        action: DeploymentAction
        allocatedPrice: number
        createdAt: string
        createdBy: string
        successAt: string
        ttl: number
        expiresAt: string
    }

    export type ServiceAccountKey = {
        createdAt: string
        // The key secret. serviceAccount.get returns it for the account's keys;
        // serviceAccount.createKey does not echo it back (re-read to obtain it).
        secret: string
    }

    export type ServiceAccount = {
        sid: string
        email: string
        name: string
        description: string
        createdAt: string
        createdBy: string
        // Populated by serviceAccount.get; omitted from serviceAccount.list.
        keys?: ServiceAccountKey[]
    }

    export type GithubLink = {
        repositoryId: number
        // owner/name
        repository: string
        installationId: number
        // service account sid
        serviceAccount: string
        serviceAccountEmail: string
        // which branch deploys to production (for the 'all'/'branch' triggers);
        // empty = any branch.
        productionBranch?: string
        // which workflow runs deploy: 'all' (push + PR previews, default),
        // 'branch' (push only, no previews), 'pr' (previews only, no branch).
        trigger?: 'all' | 'branch' | 'pr'
        createdAt: string
        createdBy: string
        // saved workflow-generator inputs, so the generator can pre-fill them;
        // absent until the user saves (on Create/Edit on GitHub).
        workflowConfig?: GitHubWorkflowConfig
    }

    // GitHubWorkflowConfig is the console workflow-generator's saved inputs for a
    // linked repository (api.GitHubWorkflowConfig). Persisted via
    // github.setWorkflowConfig and returned on github.list for pre-fill.
    export type GitHubWorkflowConfig = {
        name?: string
        location?: string
        buildType?: 'dockerfile' | 'static'
        port?: number
        protocol?: 'http' | 'https' | 'h2c'
        framework?: 'auto' | 'hugo' | 'node'
        buildCommand?: string
        outputDir?: string
        spa?: boolean
        notFound?: string
        workingDirectory?: string
        env?: string
        envGroups?: string[]
        pullSecret?: string
        requireGoogleLogin?: boolean
        allowedEmails?: string
        allowedDomains?: string
    }

    export type GithubLookupRepoResult = {
        repositoryId: number
        repository: string
        installationId: number
    }

    export type GithubAppInfo = {
        installUrl: string
    }

    export type GithubRepoItem = {
        repositoryId: number
        // owner/name
        repository: string
        private: boolean
        // installation id this repo belongs to
        installationId: number
    }

    export type GithubInstallationItem = {
        installationId: number
        createdAt: string
    }

    export type EmailDomain = {
        domain: string
        createdAt: string
    }

    export type Repository = {
        name: string
        size: number
        manifests: number
        tags: number
        createdAt: string
    }

    export type ProjectStorage = {
        size: number
        updatedAt?: string
    }

    export type RepositoryTag = {
        tag: string
        digest: string
        size: number
        createdAt: string
    }

    export type RepositoryTagResult =
        List<RepositoryTag>
        & { name: string }

    export type RepositoryManifest = {
        digest: string
        size: number
        createdAt: string
    }

    export type RepositoryManifestResult =
        List<RepositoryManifest>
        & { name: string }

    export type RegistryGcRepository = {
        repository: string
        manifests: string[]
        tags: string[]
        size: number
    }

    export type RegistryGcResult = {
        dryRun: boolean
        removedManifests: number
        removedTags: number
        reclaimedSize: number
        repositories: RegistryGcRepository[]
    }

    export type AuditActorType = 'User' | 'ServiceAccount'

    export type AuditOutcome = 'success' | 'failure'

    // The client surface a write action came through. Empty string on legacy
    // rows recorded before the channel column existed.
    export type AuditChannel = 'api' | 'console' | 'cli' | 'mcp' | ''

    export type AuditLogActor = {
        email: string
        type: AuditActorType
        // Attribution tag of the scoped (agent) token the action was made under
        // (e.g. "claude-code:pr-42"); empty/absent for non-agent actions. The
        // principal (email/type) is still the minter — the label only names the
        // agent session.
        label?: string
    }

    export type AuditLogResource = {
        type: string
        id: string
        name: string
        locationId: string
    }

    export type AuditLogItem = {
        id: number
        resource: AuditLogResource
        actor: AuditLogActor
        channel: AuditChannel
        action: string
        outcome: AuditOutcome
        detail: string
        createdAt: string
    }

    export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void'

    export type InvoiceListItem = {
        id: string
        number: string
        currency: string
        periodStart: string
        periodEnd: string
        subtotal: number
        taxAmount: number
        total: number
        status: InvoiceStatus
        issuedAt: string
        paidAt: string
        voidedAt: string
        createdAt: string
    }

    // One summary line per project: invoices are grouped by project (not SKU),
    // so each line is a project's total charge for the period. projectId /
    // project / description are snapshotted at issue time.
    export type InvoiceLineItem = {
        projectId: string
        // project is the project's sid (stable slug).
        project: string
        // description is the project's display name (falls back to the sid).
        description: string
        amount: number
    }

    export type Invoice = {
        id: string
        billingAccountId: string
        number: string
        currency: string
        periodStart: string
        periodEnd: string
        subtotal: number
        taxRate: number
        taxAmount: number
        total: number
        status: InvoiceStatus
        taxId: string
        taxName: string
        taxAddress: string
        issuedAt: string
        paidAt: string
        voidedAt: string
        createdAt: string
        lineItems: InvoiceLineItem[]
        // Seller settlement details (bank transfer + PromptPay). Static company
        // info, identical on every invoice; lets the UI show "how to pay"
        // without rendering the PDF.
        payment: InvoicePayment
    }

    export type InvoicePayment = {
        bank: string
        accountName: string
        accountNo: string
        promptPay: string
    }

    export type InvoiceDownloadResult = {
        downloadUrl: string
        expiresAt: string
    }

    export type InvoiceUploadSlipResult = {
        downloadUrl: string
        expiresAt: string
    }

    export type WafAction = 'log' | 'allow' | 'block'

    export type WafRule = {
        id: string
        description: string
        expression: string
        action: WafAction
        // status + message are only meaningful when action === 'block'
        // (status defaults to 403, message to "Forbidden").
        status?: number
        message?: string
        priority: number
    }

    export type WafLimit = {
        id: string
        description: string
        // Bucket key characteristics. Allowed entries: 'ip' | 'host' | 'asn' |
        // 'country' | 'header:<name>' | 'cookie:<name>'. Defaults to ['ip'].
        key: string[]
        // Requests per window per key; must be > 0.
        rate: number
        // Go duration string, 1s..1h (e.g. '10s', '1m', '1h').
        window: string
        algorithm?: 'fixed' | 'sliding'
        // shadow counts matches but never rejects (default enforce).
        mode?: 'enforce' | 'shadow'
        // 429 (default) or 503 only.
        status?: number
        message?: string
        // Optional CEL expression (same request.* surface as WafRule.expression)
        // scoping the limit: empty applies it to every request. request.body is
        // always '' in limit filters.
        filter?: string
    }

    export type WafZone = {
        project: string
        location: string
        description: string
        rules: WafRule[]
        limits: WafLimit[]
        status: 'pending' | 'success' | 'error'
        action: 'create' | 'delete'
        createdAt: string
        createdBy: string
    }

    export type WafZoneList = {
        project: string
        items: WafZone[]
    }

    export type WafMetricsTimeRange = '1h' | '6h' | '12h' | '1d' | '7d' | '30d'

    export type WafMetricsSeries = {
        ruleId: string
        action: WafAction
        total: number
        // [unixSeconds, count], time-ordered
        points: [number, number][]
    }

    export type WafMetricsResult = {
        series: WafMetricsSeries[]
        total: number
    }

    export type WafLimitMetricsSeries = {
        limitId: string
        result: 'allowed' | 'limited'
        total: number
        // [unixSeconds, count], time-ordered; sparse — missing bucket = 0
        points: [number, number][]
    }

    export type WafLimitMetricsResult = {
        series: WafLimitMetricsSeries[]
        total: number
    }

    export type CacheAction = 'cache' | 'bypass'

    export type CacheOverride = {
        id: string
        description: string
        // 'cache' (default) forces a caching policy onto the fill; 'bypass'
        // skips the cache entirely for matching requests. ttl/policy/status/
        // stale_* apply only to action 'cache'.
        action: CacheAction
        // Optional CEL expression (same request.* surface as WafRule.expression)
        // scoping the override: empty applies it to every request. request.body
        // is always '' in cache filters.
        filter?: string
        // Go duration; required for action 'cache' (1s..720h). The forced
        // freshness lifetime.
        ttl?: string
        // 'conservative' | 'balanced' (default) | 'aggressive'. How far the
        // force reaches over the origin's Cache-Control. cache action only.
        policy?: string
        // RFC 5861 windows (Go durations) riding the forced policy; need a ttl.
        staleWhileRevalidate?: string
        staleIfError?: string
        // Force only these origin response statuses; empty = every cacheable
        // status. cache action only.
        status?: number[]
        // shadow counts matches but never changes caching (default enforce).
        mode?: 'enforce' | 'shadow'
        // ascending; first match wins among cache rules. 0 -> parapet default
        // (100). Bypass rules are not ordered against each other.
        priority: number
    }

    export type CacheZone = {
        project: string
        location: string
        description: string
        overrides: CacheOverride[]
        status: 'pending' | 'success' | 'error'
        action: 'create' | 'delete'
        createdAt: string
        createdBy: string
    }

    export type CacheZoneList = {
        project: string
        items: CacheZone[]
    }

    // Scheduler — cron-driven outbound HTTP requests (project-scoped,
    // location-less). The auth secret is write-only: never present in responses.
    export type SchedulerAuth = {
        type: '' | 'none' | 'basic' | 'bearer'
        username?: string
        // accepted on create/update, never returned by get/list.
        secret?: string
    }

    export type SchedulerJob = {
        project: string
        name: string
        schedule: string
        timezone: string
        method: string
        url: string
        headers?: Record<string, string>
        body?: string
        auth: SchedulerAuth
        insecureSkipVerify: boolean
        paused: boolean
        // denormalized last-run state. lastResult is '' before the first run.
        lastResult: '' | 'success' | 'failed'
        lastRunAt?: string | null
        lastLatencyMs: number
        lastHttpStatus: number
        lastError: string
        nextRunAt?: string | null
        createdAt: string
        createdBy: string
        updatedAt: string
        updatedBy: string
    }

    export type SchedulerInvocation = {
        id: string
        startedAt: string
        result: 'pending' | 'success' | 'failed'
        httpStatus: number
        latencyMs: number
        error: string
    }

    export type SchedulerLogsResult = {
        project: string
        name: string
        items: SchedulerInvocation[]
    }

    // Notification — change-notification channels (project-scoped, location-less).
    // The webhook signing secret is write-only: never present in responses.
    export type NotificationConfig = {
        type: 'webhook' | 'discord' | 'pull'
        // delivery target for webhook/discord; empty for pull.
        url: string
        // accepted on create/update (webhook only), never returned by get/list.
        secret?: string
        insecureSkipVerify: boolean
        // pull only: inactivity TTL (seconds) before the channel auto-deletes;
        // 0/absent = server default.
        pullTtlSeconds?: number
    }

    export type NotificationSubscription = {
        // "<resource>.<action>" patterns: *, deployment.*, *.delete, deployment.deploy. [] = all.
        events: string[]
        outcomes: string[]
    }

    export type NotificationItem = {
        project: string
        name: string
        config: NotificationConfig
        subscription: NotificationSubscription
        disabled: boolean
        createdAt: string
        createdBy: string
        updatedAt: string
        updatedBy: string
    }

    export type NotificationDelivery = {
        id: string
        startedAt: string
        result: 'pending' | 'success' | 'retry' | 'failed'
        httpStatus: number
        latencyMs: number
        error: string
    }

    export type NotificationDeliveriesResult = {
        project: string
        name: string
        items: NotificationDelivery[]
    }

    // cache.metrics reuses WafMetricsTimeRange.
    export type CacheMetricsSeries = {
        overrideId: string
        action: CacheAction
        result: 'applied' | 'shadow' | 'error'
        total: number
        // [unixSeconds, count], time-ordered
        points: [number, number][]
    }

    export type CacheMetricsResult = {
        series: CacheMetricsSeries[]
        total: number
    }

    export type CacheResultSeries = {
        result: 'HIT' | 'MISS' | 'STALE' | 'BYPASS'
        // [unixSeconds, value], time-ordered
        requests: [number, number][]
        bytes: [number, number][]
        requestsTotal: number
        bytesTotal: number
    }

    export type CacheResultMetricsResult = {
        series: CacheResultSeries[]
    }

    export type DropboxItem = {
        downloadUrl: string
        filename: string
        size: number
        ttl: number
        createdAt: string
        expiresAt: string
    }

    export type UsageMetricsLine = {
        name: string
        points: [number, number][]
    }

    export type UsageMetricsResult = {
        egress: UsageMetricsLine[]
        storage: UsageMetricsLine[]
    }

    export type ProjectMetricsResult = {
        cpuUsage: UsageMetricsLine[]
        memory: UsageMetricsLine[]
        disk: UsageMetricsLine[]
        egress: UsageMetricsLine[]
        cacheEgress: UsageMetricsLine[]
        replica: UsageMetricsLine[]
        staticStorage: UsageMetricsLine[]
    }

    // Result of deployment.metrics. Every series is optional — the backend only
    // returns the metrics relevant to the deployment type (e.g. requests for
    // WebService/Static, storage for Static).
    export type DeploymentMetricsResult = {
        cpuUsage?: UsageMetricsLine[]
        cpuLimit?: UsageMetricsLine[]
        memoryUsage?: UsageMetricsLine[]
        memory?: UsageMetricsLine[]
        memoryLimit?: UsageMetricsLine[]
        requests?: UsageMetricsLine[]
        egress?: UsageMetricsLine[]
        storage?: UsageMetricsLine[]
    }

    // Result of disk.metrics.
    export type DiskMetricsResult = {
        usage?: UsageMetricsLine[]
        size?: UsageMetricsLine[]
    }

    export type DeploymentLogLine = {
        pod: string
        timestamp: string
        log: string
    }

    // Result of deployment.logsHistory — one bounded, paginated page of durable
    // stored log lines. nextCursor is non-empty while more remain in the window;
    // cappedByBytes is set when the page hit the server byte budget.
    export type DeploymentLogsHistoryResult = {
        lines?: DeploymentLogLine[]
        nextCursor?: string
        cappedByBytes?: boolean
    }

    // Application-error detection (Sentry-lite). An "issue" is a group of
    // identical application-level errors (panics, exceptions, stack traces the
    // app prints) deduplicated by a stable server-side fingerprint.
    export type ErrorKind = 'go' | 'java' | 'python' | 'node' | 'ruby' | 'generic'
    export type ErrorStatus = 'open' | 'resolved' | 'muted'
    // The status query also accepts 'all' (no filter); the default is 'open'.
    export type ErrorStatusFilter = ErrorStatus | 'all'
    export type ErrorSort = 'lastSeen' | 'firstSeen' | 'count'

    // One grouped issue as returned by error.list (the list view).
    //
    // `deployment` + `location` identify which deployment the issue belongs to.
    // They are always present; on the per-deployment call they echo the queried
    // deployment, and on the project-wide call (error.list without a
    // `name`) they are the column that distinguishes issues across deployments.
    export type ErrorIssue = {
        id: string
        deployment: string
        location: string
        fingerprint: string
        kind: ErrorKind
        title: string
        status: ErrorStatus
        count: number
        firstSeen: string
        lastSeen: string
        samplePod: string
    }

    // A lightweight pointer to one occurrence of an issue (recent_events). The
    // full sample stack lives once on the issue; these only carry where/when.
    export type ErrorOccurrence = {
        pod: string
        timestamp: string
        // object + offset locate the occurrence in the durable _errorlog stream
        // (used by the History deep-link, not surfaced in v1 of the tab).
        object?: string
        offset?: number
    }

    // The detail view: all list fields plus the representative sample stack and
    // the recent occurrence pointers.
    export type ErrorIssueDetail = ErrorIssue & {
        sampleMessage: string
        recentEvents: ErrorOccurrence[]
    }

    // Args of error.list. status defaults to 'open', sort to
    // 'lastSeen'; cursor is the opaque page token from a prior nextCursor.
    //
    // `location` + `name` are optional: supplying both scopes the listing to a
    // single deployment, while OMITTING `name` lists error issues across every
    // deployment in the project (the project-wide Errors view). Each returned
    // issue carries its own `deployment` + `location` regardless.
    export type ErrorListArgs = {
        project: string
        location?: string
        name?: string
        status?: ErrorStatusFilter
        limit?: number
        cursor?: string
        sort?: ErrorSort
    }

    // Result of error.list. nextCursor is non-empty while more issues
    // remain for the current filter/sort.
    export type ErrorListResult = {
        issues: ErrorIssue[]
        nextCursor?: string
    }

    // Args of error.get (detail).
    export type ErrorGetArgs = {
        project: string
        location: string
        name: string
        id: string
    }

    // Result of error.get.
    export type ErrorGetResult = {
        issue: ErrorIssueDetail
    }

    // Args of error.update (triage). status flips the lifecycle:
    // resolved / open (reopen) / muted.
    export type ErrorUpdateArgs = {
        project: string
        location: string
        name: string
        id: string
        status: ErrorStatus
    }

    export type BillingReportProject = {
        sid: string
        name: string
    }

    export type BillingReportRow = {
        projectSid: string
        name: string
        usageValue: number
        billingValue: number
    }

    export type BillingReportChartSeries = {
        name: string
        data: number[]
    }

    // Result of billing.report.
    export type BillingReport = {
        projectList: BillingReportProject[]
        projectSids: string[]
        list: BillingReportRow[]
        chart: {
            categories: string[]
            series: BillingReportChartSeries[]
        }
    }
}

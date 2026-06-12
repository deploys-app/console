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
        // eslint-disable-next-line no-unused-vars
        HTTP = 'http',
        // eslint-disable-next-line no-unused-vars
        HTTPS = 'https',
        // eslint-disable-next-line no-unused-vars
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
    }

    export type Sidecar = {
        cloudSqlProxy?: CloudSqlProxySidecar
    }

    export type SidecarType = '' | 'cloudSqlProxy'

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
        }
    }

    export type DeploymentType =
        'WebService' |
        'TCPService' |
        'InternalTCPService' |
        'Worker' |
        'CronJob'

    export type DeploymentAction =
        'deploy' |
        'delete' |
        'pause'

    export type DeploymentStatus =
        'pending' |
        'success' |
        'error' |
        'cancelled'

    export type Deployment = {
        project: string
        location: string
        name: string
        type: DeploymentType
        revision: number
        image: string
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
        url: string
        internalUrl: string
        logUrl: string
        eventUrl: string
        podsUrl: string
        statusUrl: string
        address: string
        internalAddress: string
        status: DeploymentStatus
        action: DeploymentAction
        allocatedPrice: number
        createdAt: string
        createdBy: string
        successAt: string
        ttl: number
    }

    export type ServiceAccount = {
        sid: string
        email: string
        name: string
        description: string
        createdAt: string
        createdBy: string
    }

    export type GithubLink = {
        repositoryId: number
        // owner/name
        repository: string
        installationId: number
        // service account sid
        serviceAccount: string
        serviceAccountEmail: string
        // production deploys (push events) are only accepted from this branch;
        // empty = any branch. pull-request previews are always allowed.
        productionBranch?: string
        createdAt: string
        createdBy: string
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
        createdAt: string
    }

    export type ProjectStorage = {
        size: number
        updatedAt?: string
    }

    export type RepositoryTag = {
        tag: string
        digest: string
        createdAt: string
    }

    export type RepositoryTagResult =
        List<RepositoryTag>
        & { name: string }

    export type RepositoryManifest = {
        digest: string
        createdAt: string
    }

    export type RepositoryManifestResult =
        List<RepositoryManifest>
        & { name: string }

    export type AuditActorType = 'User' | 'ServiceAccount'

    export type AuditOutcome = 'success' | 'failure'

    export type AuditLogActor = {
        email: string
        type: AuditActorType
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
}

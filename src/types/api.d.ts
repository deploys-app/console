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
        domainAllowDisableCdn: boolean
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
        disk: number
        replica: number
    }

    export type BillingProject = {
        price: number
    }

    export type PodStatus = {
        count: number
        ready: number
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
        }
        createdAt: string
    }

    export type Domain = {
        project: string
        location: string
        domain: string
        wildcard: boolean
        cdn: boolean
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
        // cpu: string
        memory: string
    }

    export type DeploymentResource = {
        requests: Resource
        limits: Resource
    }

    export type Sidecar = {
        cloudSqlProxy?: {
            instance: string
            port: number
            credentials: string
        }
    }

    export type Deployment = {
        project: string
        location: string
        name: string
        type: string
        revision: number
        image: string
        env: Env
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
        status: 'pending' | 'success' | 'error'
        action: 'deploy' | 'delete' | 'pause'
        allocatedPrice: number
        createdAt: string
        createdBy: string
        successAt: string
    }

    export type ServiceAccount = {
        sid: string
        email: string
        name: string
        description: string
        createdAt: string
        createdBy: string
    }

    export type EmailDomain = {
        domain: string
        createdAt: string
    }

    export type Repository = {
        name: string
        createdAt: string
    }

    export type RepositoryTag = {
        tag: string
        digest: string
        createdAt: string
    }

    export type RepositoryTagResult =
        List<RepositoryTag>
        & { name: string }
}

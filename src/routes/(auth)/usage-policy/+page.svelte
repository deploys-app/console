<script lang="ts">
	const fullPolicyUrl = 'https://www.deploys.app/usage-policy/'

	const points: { title: string, body: string }[] = [
		{
			title: 'Build and run your own things',
			body: 'Use any feature for any lawful purpose. The line we draw is intent and harm: workloads built to attack, defraud, deceive, or freeload off others are not allowed.'
		},
		{
			title: 'No platform abuse aimed at others',
			body: 'No crypto mining, DoS/DDoS, unauthorized scanning, malware/ransomware/botnet C2, phishing and fraud, spam, telephony/VoIP fraud, stalkerware, or abusive proxies/relays. Public Tor exit nodes aren’t allowed (IP reputation); a private VPN or good-faith Tor bridge for your own apps is fine.'
		},
		{
			title: 'No illegal content — CSAM is zero-tolerance',
			body: 'Detected CSAM means immediate termination and reporting to the authorities, no notice required. Also off-limits: piracy/counterfeiting, illegal marketplaces, unlawful hate/extremist content, and content unlawful under Thai law (Computer Crime Act, court/regulator orders).'
		},
		{
			title: 'Security research is welcome under our safe harbour',
			body: 'Test only your own resources or with written authorization, don’t touch other tenants’ data, don’t disrupt the service, and report privately to contact@moonrhythm.io.'
		},
		{
			title: 'Feature rules',
			body: 'The registry is for images you actually run (not warez/malware distribution); custom domains/CDN only for domains you control and not for laundering or hotlinking; disks and static storage aren’t bulk file lockers; invite-only email is consent-only with no open relays; keep API keys and tokens secret and within rate quotas.'
		},
		{
			title: 'Fair use & billing integrity',
			body: 'Measured against your documented quotas, rate limits, and fair-use thresholds — don’t exhaust shared capacity, shard around limits, abuse free trials, or commit billing/chargeback fraud. We won’t reclaim your domains, images, or disks while your account is in good standing and paid.'
		},
		{
			title: 'You’re responsible for your apps and end users',
			body: 'Your code, your patching, your content, and your users’ conduct. Keep your own backups; the platform isn’t a guaranteed backup service.'
		},
		{
			title: 'Data protection',
			body: 'For your end users’ data you are the controller and we are your processor (we’re the controller only for your own account data). Meet your own PDPA/GDPR duties, including breach notice to the PDPC. Our infrastructure runs outside Thailand — account for that transfer. Request a DPA at contact@moonrhythm.io.'
		},
		{
			title: 'Enforcement scales with severity',
			body: 'Severe or active abuse is actioned immediately without notice; contestable issues generally get notice and a chance to fix. Evading enforcement (new accounts to dodge a suspension) is itself a violation.'
		}
	]
</script>

<div class="page-head">
	<div>
		<h4><strong>Usage Policy</strong></h4>
		<p class="page-sub">The short version — what you can and can’t run on Deploys.app.</p>
	</div>
	<a class="button is-icon-right" href={fullPolicyUrl} target="_blank" rel="noopener">
		Read the full policy
		<i class="fa-solid fa-arrow-up-right-from-square"></i>
	</a>
</div>

<div class="grid gap-4 max-w-3xl">
	<div class="panel is-level-200">
		<ul class="grid gap-5">
			{#each points as p (p.title)}
				<li class="grid grid-cols-[auto_1fr] gap-3 items-start">
					<i class="fa-solid fa-circle-check text-primary mt-[0.2rem]" aria-hidden="true"></i>
					<div>
						<strong class="text-content">{p.title}</strong>
						<p class="text-content/70 mt-1 leading-relaxed">{p.body}</p>
					</div>
				</li>
			{/each}
		</ul>
	</div>

	<div class="panel is-level-200 text-content/70 text-sm leading-relaxed">
		<p>
			This is a summary. The full <a class="link" href={fullPolicyUrl} target="_blank" rel="noopener">Usage Policy</a>
			is the authoritative document — it supplements, and does not replace, our Privacy Policy and Terms of Service.
		</p>
		<p class="mt-2">
			See something abusive on the platform, or want to report a vulnerability? Email
			<a class="link" href="mailto:contact@moonrhythm.io">contact@moonrhythm.io</a>.
		</p>
	</div>
</div>

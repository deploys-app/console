<script context="module">
	export function load ({ stuff }) {
		const { project } = stuff

		return {
			props: {
				project
			}
		}
	}
</script>

<script>
	export let project

	let sid
	let name
	let desc
</script>

<div>
	<ul class="moon-breadcrumb">
		<li>
			<a href={`/service-account?project=${project}`} class="moon-link"><h6>Service Accounts</h6></a>
		</li>
<!--		<li>-->
<!--			<a href="{{route "serviceaccount.detail" .Page.ProjectParam (param "id" .Form.SID)}}" class="moon-link"><h6>{{.Form.SID}}</h6></a>-->
<!--		</li>-->
		<li>
			<h6>
<!--				Update-->
				Create
			</h6>
		</li>
	</ul>
</div>

<br>

<div class="moon-panel _dp-g _gg-24px">
	<div class="lo-12 _gg-12px">
		<div class="_dp-f _alit-ct">
			<h3 class="_mgr-24px _mgbt-16px _mgbt-0px-lg"><strong>
<!--				Update service account "{{.Form.SID}}"-->
				Create service account
			</strong></h3>
		</div>
	</div>

	<hr>

	<form method="POST" class="_dp-g _gg-16px _w-100pct _mxw-512px">
		<!--{{if .Update}}-->
		<!--<input type="hidden" name="update" value="1">-->
		<!--<input type="hidden" name="sid" value="{{.Form.SID}}">-->
		<!--<div class="moon-field">-->
		<!--	<label>Email</label>-->
		<!--	<div class="moon-input">-->
		<!--		<input value="{{.Form.Email}}" readonly>-->
		<!--	</div>-->
		<!--</div>-->
		<!--{{else}}-->
		<div class="moon-field">
			<label for="input-sid">ID</label>
			<div class="moon-input">
				<input name="sid" id="input-sid" placeholder="ID" bind:value={sid}>
			</div>
		</div>
		<!--{{end}}-->

		<div class="moon-field">
			<label for="input-name">Name</label>
			<div class="moon-input">
				<input id="input-name" name="name" placeholder="Name" required bind:value={name}>
			</div>
		</div>

		<div class="moon-field">
			<label for="input-description">Description</label>
			<div class="moon-textarea">
				<textarea id="input-description" rows="5" name="description" placeholder="Description" bind:value={desc}></textarea>
			</div>
		</div>

		<button class="moon-button _mgr-at">Save</button>
	</form>
</div>

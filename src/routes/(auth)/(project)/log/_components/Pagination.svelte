<script>
	const { currentPage, nextPage, gotoPage } = $props()
</script>

<div class="_mgt-6 _mgbt-6 _dp-f _fdrt-cl _jtfct-spbtw _alit-ct">
	<div></div>
	<div class="_mgt-16px _dp-f _jtfct-ct _g-16px ">
		<div class="_dp-f _fdrt-r _g-4">
			<button
				class="_w-24px _h-24px _dp-f _jtfct-ct _alit-ct"
				class:_opct-20={ currentPage <= 1 }
				class:_cs-nal={ currentPage <= 1 }
				class:_cs-pt={ currentPage > 1 }
				class:is-variant-ghost={ currentPage <= 1 }
				disabled={ currentPage <= 1 }
				onclick={ () => gotoPage(currentPage - 1) }
				aria-label="previus page"
			>
				<i class="far fa-arrow-left"></i>
			</button>
			<button
				class="_w-7 _h-7 _bdrd-50pct _dp-f _jtfct-ct _alit-ct _ffml-bold _tal-ct _bgcl-primary _cl-white"
				disabled
			>
				{ currentPage }
			</button>
			<button
				class="_w-24px _h-24px _dp-f _jtfct-ct _alit-ct"
				class:_opct-20={ !nextPage }
				class:_cs-nal={ !nextPage }
				class:_cs-pt={ nextPage }
				onclick={ () => gotoPage(currentPage + 1) }
				disabled={ !nextPage }
				aria-label="next page"
			>
				<i class="far fa-arrow-right"></i>
			</button>
		</div>
	</div>
</div>

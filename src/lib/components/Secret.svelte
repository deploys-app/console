<script>
  export let value

  let isHidden = true
</script>

<span>
  <div on:click={() => {
    isHidden = !isHidden
  }}>
    {#if isHidden}
      <i class="fa-solid fa-eye"></i>
    {:else}
      <i class="fa-solid fa-eye-slash"></i>
    {/if}
  </div>
  {#if isHidden}
  •••••••••••••••
  {:else}
    {value}
  {/if}
</span>

<style>
  span {
    display: inline-flex;
  }
  div {
    margin-right: 8px;
    cursor: pointer;
  }
</style>
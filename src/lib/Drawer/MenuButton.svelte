<script lang="ts">
	import { showDrawer, motion, lang, ripple, isAdmin } from '$lib/Stores';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import Ripple from '$lib/Actions/ripple';

	let { handleClick }: { handleClick: () => void } = $props();

	let menu: HTMLButtonElement;

	onMount(() => {
		menu.style.position = 'absolute';
	});

	async function handlePointer() {
		if ($isAdmin) await import('$lib/Drawer/Index.svelte');
	}

	function reload() {
		location.reload();
	}
</script>

<button
	onclick={$isAdmin ? handleClick : reload}
	bind:this={menu}
	transition:fade={{ duration: $motion }}
	title={$isAdmin ? $lang('menu') : 'Ricarica plancia'}
	onpointerenter={handlePointer}
	onpointerdown={handlePointer}
	use:Ripple={$ripple}
	aria-label={$isAdmin ? $lang('menu') : 'Ricarica plancia'}
>
	<svg
		class:reload-icon={!$isAdmin}
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		style:background-color={$showDrawer && $isAdmin ? 'rgba(0, 0, 0, 0.2)' : 'transparent'}
	>
		{#if $isAdmin}
			<path
				d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"
				style:transform="rotateX({$showDrawer ? 180 : 0}deg)"
				style:transition="transform {$motion / 1.3}ms ease"
			/>
		{:else}
			<path d="M17.65,6.35C16.2,4.9 14.21,4 12,4c-4.42,0-7.99,3.58-7.99,8s3.57,8 7.99,8c3.73,0 6.84-2.55 7.73-6h-2.08c-.82,2.33-3.04,4-5.65,4-3.31,0-6-2.69-6-6s2.69-6 6-6c1.66,0 3.14.69 4.22,1.78L13,11h7V4l-2.35,2.35z" />
		{/if}
	</svg>
</button>

<style>
	button {
		position: absolute;
		top: 1rem;
		right: 2rem;
		width: 2.7rem;
		background-color: transparent;
		color: white;
		border: none;
		z-index: 1;
		cursor: pointer;
		padding: 0;
		border-radius: 50%;
		height: 2.7rem;
		overflow: hidden;
	}

	svg {
		border-radius: 50%;
	}

	svg path {
		fill: currentColor;
		transform-origin: center center;
	}

	.reload-icon {
		transform: rotate(0deg);
		transition: transform 180ms ease;
	}

	button:hover .reload-icon {
		transform: rotate(90deg);
	}

	@media all and (max-width: 768px) {
		button {
			right: 1.25rem;
		}
	}
</style>

<script lang="ts">
	import {
		dashboard,
		configuration,
		editMode,
		motion,
		showDrawer,
		translation,
		drawerSearch,
		focusSearch,
		currentViewId,
		selectedLanguage,
		customJs,
		filterDashboard,
		disableMenuButton,
		clickOriginatedFromMenu,
		connection,
		youtubeAddon,
		isAdmin
	} from '$lib/Stores';
	import { authentication } from '$lib/Socket';
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { modals } from '$lib/Modals';
	import Theme from '$lib/Components/Theme.svelte';

	let { data }: { data: any } = $props();
	let altKeyPressed = $state(false);

	$configuration = data?.configuration;
	$dashboard = data?.dashboard;
	$translation = data?.translations;
	$selectedLanguage = data?.configuration?.locale || 'en';
	$customJs = data?.configuration?.custom_js;
	$youtubeAddon = data?.configuration?.addons?.youtube;
	$currentViewId = $dashboard?.views?.[0]?.id;

	const _motion = data?.configuration?.motion;
	$motion = _motion === undefined || _motion === true ? $motion : 0;

	let view = $derived(
		$drawerSearch
			? $filterDashboard
			: $dashboard?.views?.find((view) => view?.id === $currentViewId) ||
					$dashboard?.views?.find((view) => view?.isDndShadowItem)
	);

	let isConnecting = false;
	let retryInterval: ReturnType<typeof setInterval>;

	if (browser) {
		document.documentElement.lang = $selectedLanguage || 'en';
		connect();
		retryInterval = setInterval(connect, 3000);
	}

	async function connect() {
		if (isConnecting) return;
		isConnecting = true;
		try {
			await authentication($configuration);
			clearInterval(retryInterval);
		} catch {
		} finally {
			isConnecting = false;
		}
	}

	$effect(() => {
		if ($configuration?.token) updateConnection();
	});

	function updateConnection() {
		if (isConnecting || !browser) return;
		clearInterval(retryInterval);
		connect();
		retryInterval = setInterval(connect, 3000);
	}

	onDestroy(() => clearInterval(retryInterval));

	onMount(async () => {
		const menuParam = new URLSearchParams(window.location.search).get('menu');
		$disableMenuButton = menuParam === 'false';

		if ('serviceWorker' in navigator) {
			try {
				const registrations = await navigator.serviceWorker.getRegistrations();
				for (const registration of registrations) await registration.unregister();
			} catch (error) {
				console.error('Error during service worker unregistration:', error);
			}
		}
	});

	function toggleDrawer() {
		$showDrawer = !$showDrawer;
		$clickOriginatedFromMenu = false;
	}

	function handleClick() {
		if ($editMode) {
			$clickOriginatedFromMenu = true;
			const button = document.querySelector('#editmode') as HTMLButtonElement;
			button?.click();
		} else {
			toggleDrawer();
		}
	}

	function reloadDashboard() {
		location.reload();
	}

	function handleKeydown(event: KeyboardEvent) {
		if ($modals.length) return;
		if (event.key === 'Escape' && !$editMode && document.activeElement) {
			(document.activeElement as HTMLElement).blur();
		}
		if (event.key === 'Alt') altKeyPressed = true;
		if (event.key === 'f' && !$disableMenuButton && $isAdmin) {
			if (!$showDrawer || !$focusSearch) {
				$focusSearch = true;
				if (!$showDrawer) $showDrawer = true;
				event.preventDefault();
			}
		} else if (event.key === 'Escape' && $showDrawer && !$editMode && $isAdmin) {
			$focusSearch = false;
			if (!$drawerSearch) handleClick();
			$drawerSearch = undefined;
		}
	}

	function handleKeyup(event: KeyboardEvent) {
		if (event.key === 'Alt') altKeyPressed = false;
	}
</script>

<svelte:window onkeydown={handleKeydown} onkeyup={handleKeyup} />
<Theme initial={data?.theme} />

<div
	id="layout"
	style:grid-template-columns="{$dashboard?.hide_sidebar || !$dashboard?.sidebar?.length ? '0' : $dashboard?.sidebarWidth || 350}px auto"
	style:grid-template-rows={$showDrawer ? 'auto auto 1fr' : '0fr auto 1fr'}
	style:transition="grid-template-rows {$motion}ms ease, grid-template-columns {$motion}ms ease"
>
	{#await import('$lib/Main/Views.svelte') then Views}
		<Views.default {view} />
	{/await}

	{#if view?.sections}
		{#await import('$lib/Main/Index.svelte') then Main}
			<Main.default {view} {altKeyPressed} />
		{/await}
	{:else if $connection}
		{#await import('$lib/Main/Intro.svelte') then Intro}
			<Intro.default {data} />
		{/await}
	{/if}

	{#await import('$lib/Sidebar/Index.svelte') then Sidebar}
		<Sidebar.default {altKeyPressed} />
	{/await}

	<!-- Admins get the normal menu. Non-admins get only a reload button. -->
	{#if !$disableMenuButton}
		{#if $isAdmin}
			{#await import('$lib/Drawer/MenuButton.svelte') then MenuButton}
				<MenuButton.default {handleClick} />
			{/await}
		{:else}
			<button class="reload-button" aria-label="Reload dashboard" title="Reload dashboard" onclick={reloadDashboard}>
				↻
			</button>
		{/if}
	{/if}

	{#if $showDrawer && $isAdmin}
		{#await import('$lib/Drawer/Index.svelte') then Drawer}
			<Drawer.default {view} {data} {toggleDrawer} />
		{/await}
	{/if}

	{#if $customJs}
		{#await import('$lib/Components/CustomJs.svelte') then CustomJs}
			<CustomJs.default />
		{/await}
	{/if}

	{#await import('$lib/Components/CustomCss.svelte') then CustomCss}
		<CustomCss.default />
	{/await}
</div>

<style>
	#layout {
		display: grid;
		grid-template-areas:
			'header header'
			'aside nav'
			'aside main';
		min-height: 100vh;
		overflow: hidden;
	}

	.reload-button {
		position: fixed;
		top: 12px;
		right: 12px;
		z-index: 1000;
		width: 40px;
		height: 40px;
		border: 0;
		border-radius: 50%;
		background: var(--card-background-color, rgba(0, 0, 0, 0.35));
		color: var(--primary-text-color, #fff);
		font-size: 24px;
		line-height: 40px;
		text-align: center;
		cursor: pointer;
		backdrop-filter: blur(8px);
	}

	.reload-button:hover {
		opacity: 0.8;
	}

	@media (max-width: 768px) {
		#layout {
			display: grid;
			grid-template-areas:
				'header header'
				'aside aside'
				'nav nav'
				'main main';
			min-height: 100vh;
			overflow: hidden;
			grid-template-rows: auto auto auto 1fr !important;
		}
	}
</style>

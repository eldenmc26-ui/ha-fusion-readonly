<script lang="ts">
	import { dashboard, editMode, motion, lang, ripple, history, historyIndex, modals, isAdmin } from '$lib/Stores';
	import { base } from '$app/paths';
	import Ripple from '$lib/Actions/ripple';
	import Icon from '@iconify/svelte';

	let { modified }: { modified: boolean } = $props();

	function handleKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key === 's') {
			if ($modals.length === 0 && $editMode && $isAdmin && modified) {
				event.preventDefault();
				handleClick();
			}
		}
	}

	async function handleClick() {
		if (!$isAdmin || !modified) return;

		try {
			const response = await fetch(`${base}/_api/save_dashboard`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-HA-Fusion-Admin': 'true'
				},
				body: JSON.stringify($dashboard)
			});

			const data = await response.json();

			if (response.ok && data.message === 'saved') {
				$dashboard = JSON.parse($history[$historyIndex]);
				$history[0] = $history[$historyIndex];

				if ($history.length === 2 && $history[0] === $history[1]) {
					$history.pop();
					$historyIndex = 0;
				}
			} else {
				throw new Error(data.message);
			}
		} catch (error) {
			console.error(error);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<button
	class="button"
	onclick={handleClick}
	use:Ripple={{
		...$ripple,
		color: modified ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0)'
	}}
	style:opacity={modified ? '1' : '0.5'}
	style:cursor={modified ? 'pointer' : 'unset'}
	style:color={modified ? '#3b0f10' : 'currentColor'}
	style:background-color={modified ? '#ffc107' : 'var(--theme-drawer-button-background-color)'}
	style:transition="all {$motion}ms ease"
>
	<figure>
		<Icon icon="ic:round-save" height="none" />
	</figure>

	{$lang('save')}
</button>

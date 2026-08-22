<script lang="ts">
	import { connection, ripple } from '$lib/Stores';
	import { loadIcons } from '@iconify/svelte';
	import { Icon } from '@iconify/svelte';
	import Ripple from '$lib/Actions/ripple';

	let adding = $state(false);

	$effect(() => {
		loadIcons(['mdi:view-dashboard-plus']);
	});

	async function addToDashboard() {
		if (adding || !$connection) return;
		adding = true;

		try {
			const config: any = await $connection.sendMessagePromise({
				type: 'lovelace/config'
			});

			const views = Array.isArray(config?.views) ? config.views : [];
			if (!views.length) {
				views.push({ title: 'Home', path: 'home', cards: [] });
			}

			const firstView = views[0];
			firstView.cards = Array.isArray(firstView.cards) ? firstView.cards : [];

			// Use the current Fusion ingress URL. This keeps the feature entirely
			// inside the add-on and does not require a long-lived access token.
			const fusionUrl = `${window.location.origin}${window.location.pathname}`;
			const alreadyAdded = firstView.cards.some(
				(card: any) => card?.type === 'iframe' && card?.url === fusionUrl
			);

			if (!alreadyAdded) {
				firstView.cards.push({
					type: 'iframe',
					url: fusionUrl,
					aspect_ratio: '16:9'
				});

				await $connection.sendMessagePromise({
					type: 'lovelace/config/save',
					config
				});
			}

			alert(alreadyAdded ? 'HA Fusion è già presente nella dashboard.' : 'HA Fusion è stata aggiunta alla dashboard.');
		} catch (error) {
			console.error('Unable to add HA Fusion to the dashboard:', error);
			alert('Non è stato possibile aggiungere HA Fusion alla dashboard. Controlla che la dashboard sia in modalità di archiviazione e che l\'account sia amministratore.');
		} finally {
			adding = false;
		}
	}
</script>

<button onclick={addToDashboard} disabled={adding} title="Aggiungi HA Fusion alla dashboard" use:Ripple={$ripple}>
	<Icon icon="mdi:view-dashboard-plus" width="22" height="22" />
	<span>{adding ? 'Aggiunta…' : 'Aggiungi alla dashboard'}</span>
</button>

<style>
	button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border: none;
		background: transparent;
		color: white;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		padding: 0.45rem 0.7rem;
		border-radius: 0.6rem;
	}

	button:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
	}

	button:disabled {
		opacity: 0.55;
		cursor: wait;
	}
</style>

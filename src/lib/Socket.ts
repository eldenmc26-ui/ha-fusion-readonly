import {
	getAuth,
	createLongLivedTokenAuth,
	createConnection,
	subscribeConfig,
	subscribeEntities,
	subscribeServices,
	ERR_CANNOT_CONNECT,
	ERR_INVALID_AUTH,
	ERR_CONNECTION_LOST,
	ERR_HASS_HOST_REQUIRED,
	ERR_INVALID_HTTPS_TO_HTTP,
	ERR_INVALID_AUTH_CALLBACK
} from 'home-assistant-js-websocket';
import type { Auth, AuthData } from 'home-assistant-js-websocket';
import {
	states,
	connection,
	config,
	services,
	connected,
	event,
	persistentNotifications,
	isAdmin
} from '$lib/Stores';
import { openModal, closeModal } from '$lib/Modals';
import type { Configuration, PersistentNotification } from '$lib/Types';

const options = {
	hassUrl: undefined as string | undefined,
	async loadTokens() {
		try {
			const raw = localStorage.hassTokens;
			if (!raw || raw === 'null' || raw === 'undefined') return undefined;
			const tokens = JSON.parse(raw);
			if (!tokens?.access_token && !tokens?.refresh_token) return undefined;
			return tokens;
		} catch {
			return undefined;
		}
	},
	saveTokens(tokens: AuthData | null) {
		localStorage.hassTokens = JSON.stringify(tokens);
	},
	clearTokens() {
		localStorage.removeItem('hassTokens');
	}
};

let tokenPromptOpen = false;

function trackSubscription(subscription: Promise<unknown>, channel: string) {
	void subscription.catch((error) => {
		console.error(`Home Assistant ${channel} subscription failed`, error);
		connected.set(false);
	});
}

export async function authentication(configuration: Configuration) {
	if (!configuration?.hassUrl) {
		connected.set(false);
		throw new Error('Home Assistant URL is not configured');
	}

	let auth: Auth | undefined;

	try {
		if (configuration?.token) {
			auth = createLongLivedTokenAuth(configuration?.hassUrl, configuration?.token);
		} else if (navigator.userAgent.includes('Home Assistant')) {
			if (!tokenPromptOpen) {
				tokenPromptOpen = true;
				openModal(() => import('$lib/Components/TokenModal.svelte'));
			}
			connected.set(false);
			throw new Error('A long-lived access token is required in the companion app');
		} else {
			const isIngress = window.location.pathname.includes('/api/hassio_ingress/');
			const redirectUrl = isIngress
				? `${window.location.origin}${window.location.pathname}`
				: undefined;

			auth = await getAuth({
				...options,
				hassUrl: configuration?.hassUrl,
				...(redirectUrl && { redirectUrl })
			});
			if (auth.expired) await auth.refreshAccessToken();
		}

		const conn = await createConnection({ auth });
		tokenPromptOpen = false;
		connection.set(conn);
		connected.set(true);

		// Determine whether the current Home Assistant user is an administrator.
		try {
			const user = await conn.sendMessagePromise({ type: 'auth/current_user' });
			isAdmin.set(user?.is_admin === true);
	} catch (error) {
			console.error('Unable to determine Home Assistant admin status', error);
			isAdmin.set(false);
		}

		subscribeEntities(conn, (hassEntities) => states.set(hassEntities));
		subscribeConfig(conn, (hassConfig) => config.set(hassConfig));
		subscribeServices(conn, (hassServices) => services.set(hassServices));

		conn.addEventListener('ready', () => {
			console.debug('connected.');
			connected.set(true);
		});

		conn.addEventListener('disconnected', () => {
			console.debug('connecting...');
			connected.set(false);
			isAdmin.set(false);
		});

		conn.addEventListener('reconnect-error', () => {
			console.error('ERR_INVALID_AUTH.');
			connected.set(false);
			isAdmin.set(false);
		});

		if (location.search.includes('auth_callback=1')) {
			history.replaceState(null, '', location.pathname);
		}

		trackSubscription(
			conn.subscribeMessage(
				(message: any) => {
					const trigger = message?.variables?.trigger?.event?.data?.event;
					if (trigger === 'close_popup') {
						event.set('close_popup');
						closeModal();
					} else if (trigger === 'refresh') {
						sessionStorage.setItem('event', 'refresh');
						location.reload();
					}
				},
				{
					type: 'subscribe_trigger',
					trigger: {
						platform: 'event',
						event_type: 'HA_FUSION'
					}
				}
			),
			'HA_FUSION events'
		);

		trackSubscription(
			conn.subscribeMessage(
				(data: {
					type: 'added' | 'removed' | 'current' | 'updated';
					notifications: Record<string, PersistentNotification>;
				}) => {
					if (data?.type === 'current') {
						persistentNotifications.set(data?.notifications);
					} else if (data?.type === 'added' || data?.type === 'updated') {
						persistentNotifications.update((notifications) => ({
							...notifications,
							...data?.notifications
						}));
					} else if (data?.type === 'removed') {
						persistentNotifications.update((notifications) => {
							Object.keys(data?.notifications).forEach((notificationId) => {
								delete notifications[notificationId];
							});
							return { ...notifications };
						});
					}
				},
				{
					type: 'persistent_notification/subscribe'
				}
			),
			'persistent notifications'
		);
	} catch (_error) {
		handleError(_error);
	}
}

function handleError(_error: unknown) {
	switch (_error) {
		case ERR_INVALID_AUTH:
			console.error('ERR_INVALID_AUTH');
			options.clearTokens();
			break;
		case ERR_INVALID_AUTH_CALLBACK:
			console.error('ERR_INVALID_AUTH_CALLBACK');
			options.clearTokens();
			if (location.search.includes('auth_callback=1')) {
				history.replaceState(null, '', location.pathname);
			}
			break;
		case ERR_CANNOT_CONNECT:
			console.error('ERR_CANNOT_CONNECT');
			break;
		case ERR_CONNECTION_LOST:
			console.error('ERR_CONNECTION_LOST');
			break;
		case ERR_HASS_HOST_REQUIRED:
			console.error('ERR_HASS_HOST_REQUIRED');
			break;
		case ERR_INVALID_HTTPS_TO_HTTP:
			console.error('ERR_INVALID_HTTPS_TO_HTTP');
			break;
		default:
			console.error(_error);
	}
	throw _error;
}

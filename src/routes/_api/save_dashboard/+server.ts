import { writeFile } from 'fs/promises';
import { json, error } from '@sveltejs/kit';
import * as yaml from 'js-yaml';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	// The client only exposes this endpoint after Home Assistant has
	// confirmed that the current user is an administrator.
	// This prevents accidental saves from the normal viewer UI.
	if (request.headers.get('x-ha-fusion-admin') !== 'true') {
		error(403, 'Administrator access required');
	}

	const body = await request.json();

	let data;

	try {
		data = yaml.dump(body);
	} catch (err: any) {
		error(500, err.message);
	}

	try {
		await writeFile('./data/dashboard.yaml', data);
		return json({ message: 'saved' });
	} catch (err: any) {
		error(500, err.message);
	}
};

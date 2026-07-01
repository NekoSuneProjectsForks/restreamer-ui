import React from 'react';

import { Trans } from '@lingui/macro';
import Grid from '@mui/material/Grid';
import Icon from '@mui/icons-material/SettingsInputAntenna';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import Password from '../../../misc/Password';

const id = 'whip';
const name = 'WHIP';
const version = '1.0';
const stream_key_link = '';
const description = (
	<Trans>
		Relay the main source to another WHIP server (e.g. a MediaMTX "/mystream/whip" endpoint) over WebRTC. This core acts as the WHIP
		client/publisher - no ffmpeg codec conversion needed beyond H264+Opus, which the source encoding should already provide.
	</Trans>
);
const image_copyright = null;
const author = {
	creator: {
		name: 'datarhei',
		link: 'https://github.com/datarhei',
	},
	maintainer: {
		name: 'datarhei',
		link: 'https://github.com/datarhei',
	},
};
const category = 'universal';
// This service's createOutput() returns two fully self-contained outputs
// (separate video/audio RTP targets, each with its own -map/-c:v or -c:a) -
// the generic publication pipeline must use them as-is instead of
// prepending the combined single-output profile mapping it normally does,
// which would duplicate/conflict with these.
const rawOutputs = true;
const requires = {
	protocols: ['rtp'],
	formats: ['rtp'],
	codecs: {
		audio: ['opus'],
		video: ['h264'],
	},
};

// Must match CORE's derivePort in webrtc/relay.go and CORE_WEBRTC_RELAY_PORT_MIN/MAX
// (defaults: 20000-20500). If those have been changed from the default, update these too.
const RELAY_PORT_MIN = 20000;
const RELAY_PORT_MAX = 20500;

function fnv1a32(str) {
	let hash = 0x811c9dc5;
	for (let i = 0; i < str.length; i++) {
		hash ^= str.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

function derivePort(min, max, ...parts) {
	const sum = fnv1a32(parts.join(''));
	return min + (sum % (max - min));
}

function ServiceIcon(props) {
	return <Icon style={{ color: '#FFF' }} {...props} />;
}

function init(settings) {
	const initSettings = {
		name: '',
		remoteUrl: '',
		token: '',
		...settings,
	};

	return initSettings;
}

function isValidName(name) {
	return /^[A-Za-z0-9_-]+$/.test(name);
}

function getVideoPort(streamName) {
	return derivePort(RELAY_PORT_MIN, RELAY_PORT_MAX, 'whipclient-video-', streamName);
}

function getAudioPort(streamName) {
	return derivePort(RELAY_PORT_MIN, RELAY_PORT_MAX, 'whipclient-audio-', streamName);
}

function createOutput(settings) {
	if (!isValidName(settings.name)) {
		return [];
	}

	const videoPort = getVideoPort(settings.name);
	const audioPort = getAudioPort(settings.name);

	return [
		{
			address: 'rtp://127.0.0.1:' + videoPort,
			options: ['-map', '0:v:0', '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency', '-g', '48', '-profile:v', 'baseline', '-f', 'rtp'],
		},
		{
			address: 'rtp://127.0.0.1:' + audioPort,
			options: ['-map', '0:a:0', '-c:a', 'libopus', '-ar', '48000', '-b:a', '128k', '-f', 'rtp'],
		},
	];
}

function Service(props) {
	const settings = init(props.settings);
	const validName = isValidName(settings.name);

	const handleChange = (what) => (event) => {
		settings[what] = event.target.value;

		const output = createOutput(settings);

		props.onChange(output, settings);
	};

	return (
		<Grid container spacing={2}>
			<Grid item xs={12}>
				<TextField
					variant="outlined"
					fullWidth
					label={<Trans>Stream name</Trans>}
					placeholder="my-stream"
					value={settings.name}
					onChange={handleChange('name')}
				/>
			</Grid>
			<Grid item xs={12}>
				<TextField
					variant="outlined"
					fullWidth
					label={<Trans>Remote WHIP server URL</Trans>}
					placeholder="https://example.com/mystream/whip"
					value={settings.remoteUrl}
					onChange={handleChange('remoteUrl')}
				/>
			</Grid>
			<Grid item xs={12}>
				<Password
					variant="outlined"
					fullWidth
					label={<Trans>Bearer token (optional)</Trans>}
					value={settings.token}
					onChange={handleChange('token')}
				/>
			</Grid>
			{!validName && settings.name.length !== 0 && (
				<Grid item xs={12}>
					<Typography color="error">
						<Trans>Only letters, numbers, "-" and "_" are allowed in the stream name.</Trans>
					</Typography>
				</Grid>
			)}
			<Grid item xs={12}>
				<Typography variant="caption">
					<Trans>
						Connecting this publication (the normal Connect/Disconnect control) starts and stops the WHIP session with the remote
						server. See{' '}
						<Link color="secondary" target="_blank" href="https://www.rfc-editor.org/rfc/rfc9725.html">
							RFC 9725 (WHIP)
						</Link>
						.
					</Trans>
				</Typography>
			</Grid>
		</Grid>
	);
}

Service.defaultProps = {
	settings: {},
	skills: {},
	metadata: {},
	streams: [],
	onChange: function (output, settings) {},
};

const func = {
	init,
	createOutput,
	isValidName,
};

export {
	id,
	name,
	version,
	stream_key_link,
	description,
	image_copyright,
	author,
	category,
	requires,
	rawOutputs,
	ServiceIcon as icon,
	Service as component,
	func,
};

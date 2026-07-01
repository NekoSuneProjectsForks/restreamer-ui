import React from 'react';

import { faTools } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Trans } from '@lingui/macro';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import BoxText from '../../../misc/BoxText';
import BoxTextarea from '../../../misc/BoxTextarea';
import Select from '../../../misc/Select';
import Textarea from '../../../misc/Textarea';

const id = 'whep';
const name = 'WHEP';
const version = '1.0';
const stream_key_link = '';
const description = (
	<Trans>
		Play the main source over WebRTC (sub-second latency) via WHEP. This does not itself let VRChat play the stream - VRChat's video
		players don't support WebRTC - but it's the fastest way to preview/monitor a stream in a browser, and a building block for anything
		else that speaks WHEP.
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
const requires = {
	protocols: ['rtp'],
	formats: ['rtp'],
	codecs: {
		audio: ['opus'],
		video: ['h264'],
	},
};

// The WHEP server always speaks H264+Opus on the ffmpeg-facing side (see
// CORE's webrtc package), so this service transcodes to that pair by
// default. If the process already produces H264+Opus upstream, "copy" avoids
// the extra transcode.
function ServiceIcon(props) {
	return <FontAwesomeIcon icon={faTools} style={{ color: '#39B54A' }} {...props} />;
}

// Must match CORE_WEBRTC_RELAY_PORT_MIN/MAX (defaults: 20000-20500). If
// those have been changed from the default, update these too - the ffmpeg
// output address is computed independently here so no reservation
// round-trip is needed, but that means both sides have to agree on the
// port range.
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

const isValidName = (name) => {
	return /^[A-Za-z0-9_-]+$/.test(name);
};

const getVideoPort = (streamName) => derivePort(RELAY_PORT_MIN, RELAY_PORT_MAX, 'whep-video-', streamName);
const getAudioPort = (streamName) => derivePort(RELAY_PORT_MIN, RELAY_PORT_MAX, 'whep-audio-', streamName);

const getWHEPAddress = (streamName) => {
	return window.location.protocol + '//' + window.location.host + '/whep/' + streamName;
};

function init(settings) {
	const initSettings = {
		name: '',
		videoCodec: 'transcode',
		audioCodec: 'transcode',
		...settings,
	};

	return initSettings;
}

function Service(props) {
	const settings = init(props.settings);
	const validName = isValidName(settings.name);

	const handleChange = (what) => (event) => {
		settings[what] = event.target.value;

		const output = createOutput(settings);

		props.onChange(output, settings);
	};

	const createOutput = (settings) => {
		if (!isValidName(settings.name)) {
			return [];
		}

		const videoPort = getVideoPort(settings.name);
		const audioPort = getAudioPort(settings.name);

		const videoOptions = ['-map', '0:v:0'];
		if (settings.videoCodec === 'copy') {
			videoOptions.push('-c:v', 'copy');
		} else {
			videoOptions.push('-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency', '-g', '48', '-profile:v', 'baseline');
		}
		videoOptions.push('-f', 'rtp');

		const audioOptions = ['-map', '0:a:0'];
		if (settings.audioCodec === 'copy') {
			audioOptions.push('-c:a', 'copy');
		} else {
			audioOptions.push('-c:a', 'libopus', '-b:a', '128k');
		}
		audioOptions.push('-f', 'rtp');

		return [
			{ address: 'rtp://127.0.0.1:' + videoPort, options: videoOptions },
			{ address: 'rtp://127.0.0.1:' + audioPort, options: audioOptions },
		];
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
			{settings.name.length !== 0 && !validName && (
				<Grid item xs={12}>
					<BoxText color="dark">
						<Typography>
							<Trans>Only letters, numbers, "-" and "_" are allowed.</Trans>
						</Typography>
					</BoxText>
				</Grid>
			)}
			{validName && (
				<React.Fragment>
					<Grid item xs={12}>
						<Typography>
							<Trans>Viewers/players that speak WHEP can watch this stream at this URL:</Trans>
						</Typography>
					</Grid>
					<Grid item xs={12}>
						<BoxTextarea>
							<Textarea rows={1} value={getWHEPAddress(settings.name)} readOnly allowCopy />
						</BoxTextarea>
					</Grid>
				</React.Fragment>
			)}
			<Grid item xs={12}>
				<Accordion className="accordion">
					<AccordionSummary className="accordion-summary" elevation={0} expandIcon={<ArrowDropDownIcon />}>
						<Typography>
							<Trans>Advanced settings</Trans>
						</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Grid container spacing={2}>
							<Grid item xs={12} md={6}>
								<Select type="select" label={<Trans>Video codec</Trans>} value={settings.videoCodec} onChange={handleChange('videoCodec')}>
									<MenuItem value="transcode">transcode to H264 (recommended)</MenuItem>
									<MenuItem value="copy">copy (only if the source is already H264)</MenuItem>
								</Select>
							</Grid>
							<Grid item xs={12} md={6}>
								<Select type="select" label={<Trans>Audio codec</Trans>} value={settings.audioCodec} onChange={handleChange('audioCodec')}>
									<MenuItem value="transcode">transcode to Opus (recommended)</MenuItem>
									<MenuItem value="copy">copy (only if the source is already Opus)</MenuItem>
								</Select>
							</Grid>
							<Grid item xs={12}>
								<Typography variant="caption">
									<Trans>
										The WHEP server only speaks H264 and Opus. If you pick "copy" for a source that isn't already in that codec,
										playback will fail.
									</Trans>
								</Typography>
							</Grid>
						</Grid>
					</AccordionDetails>
				</Accordion>
			</Grid>
			<Grid item xs={12}>
				<Typography variant="caption">
					<Trans>
						Requires the WebRTC server to be enabled. See{' '}
						<Link color="secondary" target="_blank" href="https://datatracker.ietf.org/doc/draft-ietf-wish-whep/">
							WHEP
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

export { id, name, version, stream_key_link, description, image_copyright, author, category, requires, ServiceIcon as icon, Service as component };
